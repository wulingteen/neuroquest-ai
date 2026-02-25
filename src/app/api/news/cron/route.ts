import { NextResponse } from "next/server";
import Parser from "rss-parser";
import db from "@/lib/db";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

export const maxDuration = 300;

const RSS_FEEDS_LIST = [
    { name: "WIRED – Artificial Intelligence", url: "https://www.wired.com/feed/tag/ai/latest/rss" },
    { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml" },
    { name: "AI Trends", url: "https://www.aitrends.com/feed" },
    { name: "EnterpriseAI / AIwire (HPCwire)", url: "https://www.hpcwire.com/category/ai/feed/" },
    { name: "ScienceDaily – Artificial Intelligence", url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml" },
    { name: "Artificial-Intelligence. Blog – AI News", url: "https://www.artificial-intelligence.blog/ai-news?format=rss" },
    { name: "OpenAI Blog", url: "https://openai.com/news/rss.xml" },
    { name: "Google Research Blog", url: "https://research.google/blog/rss/" },
    { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
    { name: "TechCrunch AI", url: "https://techcrunch.com/tag/artificial-intelligence/feed/" },
    { name: "Amazon Science Blog", url: "https://www.amazon.science/index.rss" },
    { name: "Berkeley AI Research (BAIR) Blog", url: "https://bair.berkeley.edu/blog/feed.xml" },
    { name: "AI Weirdness", url: "https://aiweirdness.com/feed" },
    { name: "Medium - Artificial Intelligence Magazine", url: "https://becominghuman.ai/feed" },
    { name: "MIT AI News", url: "http://news.mit.edu/rss/topic/artificial-intelligence2" },
    { name: "NVIDIA AI Blog", url: "https://blogs.nvidia.com/feed" },
    { name: "AI Paper Review – David Stutz", url: "https://davidstutz.de/feed" },
    { name: "Microsoft Research Blog", url: "https://www.microsoft.com/en-us/research/blog/feed/" },
    { name: "Fast. Ai (NLP / general)", url: "http://nlp.fast.ai/feed.xml" },
    { name: "JMLR recent papers", url: "http://www.jmlr.org/jmlr.xml" },
    { name: "Blog Distill", url: "https://distill.pub/rss.xml" },
    { name: "Blog inFERENCe", url: "https://www.inference.vc/rss/" } // fixed URL from markdown
];

// Using PrismaClient from config
const apiKey = process.env.OPENROUTER_API_KEY;

const openai = new OpenAI({
    apiKey: apiKey || "dummy_key", // dummy_key allows instantiation but will fail gracefully later if used
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "https://neuroquest.ai",
        "X-Title": "NeuroQuest AI",
    }
});

// Using a specific LLM model by OpenRouter as instructed. 
const RANKER_MODEL = "google/gemini-2.5-flash";
const EXAMINER_MODEL = "google/gemini-2.5-pro";

export async function GET() {
    try {
        const parser = new Parser();

        if (!process.env.OPENROUTER_API_KEY) {
            console.error("Missing OPENROUTER_API_KEY in environment variables.");
            return NextResponse.json({ error: "Missing OPENROUTER_API_KEY in environment variables." }, { status: 500 });
        }

        // 1. Ensure feeds are in DB
        for (const f of RSS_FEEDS_LIST) {
            await db.rss_feeds.upsert({
                where: { url: f.url },
                update: {},
                create: { name: f.name, url: f.url },
            });
        }

        const feeds = await db.rss_feeds.findMany({ where: { enabled: true } });

        // 2. Fetch new RSS articles
        let newArticlesCount = 0;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        for (const feed of feeds) {
            try {
                const parsed = await parser.parseURL(feed.url);
                for (const item of parsed.items || []) {
                    if (!item.link || !item.title) continue;

                    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
                    // Skip if article is from a previous day
                    if (pubDate < todayStart) continue;

                    const existing = await db.news_articles.findUnique({
                        where: { url: item.link } // url is unique
                    });

                    if (!existing) {
                        await db.news_articles.create({
                            data: {
                                feed_id: feed.feed_id,
                                url: item.link,
                                title: item.title,
                                summary: item.contentSnippet || item.content || "",
                                published_at: pubDate,
                            }
                        });
                        newArticlesCount++;
                    }
                }
                await db.rss_feeds.update({
                    where: { feed_id: feed.feed_id },
                    data: { last_fetched_at: new Date() }
                });
            } catch (_e) {
                console.warn(`Failed to parse feed ${feed.url}`);
            }
        }

        // 3. Select articles for today using LLM
        // Filter strictly for articles published today that haven't been selected yet
        const recentArticles = await db.news_articles.findMany({
            where: {
                published_at: { gte: todayStart },
                news_selections: { none: {} } // Not yet selected
            },
            select: { article_id: true, title: true, summary: true }
        });

        if (recentArticles.length === 0) {
            return NextResponse.json({ message: "No new articles to rank." });
        }

        // Since LLM needs to process these, we can batch them if too many
        // For safety, limit to 200 items for context window
        const articlesToRank = recentArticles.slice(0, 200);
        const articlesJSON = articlesToRank.map(a => ({
            id: a.article_id.toString(),
            title: a.title,
            summary: a.summary?.substring(0, 200) // Truncate summary
        }));

        const rankerPrompt = `
You are an expert content curator. I will provide a JSON array of news articles with their 'id', 'title', and 'summary'.
1. Evaluate each article based on its difficulty, interest, and relevance to AI reading comprehension.
2. Assign each article a score from 0 to 100.
3. Group them into 10 score brackets:
   Bracket 1: 0-10
   Bracket 2: 11-20
   Bracket 3: 21-30
   Bracket 4: 31-40
   Bracket 5: 41-50
   Bracket 6: 51-60
   Bracket 7: 61-70
   Bracket 8: 71-80
   Bracket 9: 81-90
   Bracket 10: 91-100
4. From each bracket, select exactly 3 articles (if a bracket doesn't have 3, pick as many as available).
5. Output ONLY valid JSON in the form:
[
  { "id": "integer string", "tier": "bracket number from 1 to 10" }
]
Do not output markdown code blocks or any extra text, ONLY the JSON array.
Articles:
${JSON.stringify(articlesJSON)}
`;

        const rankingResponse = await openai.chat.completions.create({
            model: RANKER_MODEL,
            messages: [{ role: "user", content: rankerPrompt }],
        });

        let selectedList: Array<{ id: string; tier: number }> = [];
        try {
            const respContent = rankingResponse.choices[0].message.content || "[]";
            selectedList = JSON.parse(respContent.replace(/```json|```/gi, '').trim());
        } catch (_e) {
            console.error("Failed to parse LLM ranking response", rankingResponse.choices[0].message.content);
            return NextResponse.json({ error: "Ranking LLM failed to output JSON" }, { status: 500 });
        }

        // 4. For the selected articles, fetch full content and generate questions
        for (const sel of selectedList) {
            const articleIdBigInt = BigInt(sel.id);

            const article = await db.news_articles.findUnique({
                where: { article_id: articleIdBigInt }
            });
            if (!article) continue;

            let fullText = article.full_text;

            if (!fullText) {
                // Fetch original content
                try {
                    const res = await fetch(article.url, {
                        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
                        redirect: "follow",
                        signal: AbortSignal.timeout(10000)
                    });
                    const html = await res.text();
                    const $ = cheerio.load(html);

                    // Remove scripts, styles, and unwanted tags
                    $("script, style, noscript, nav, header, footer, iframe, aside").remove();

                    // Extract text from commonly used main content tags
                    const mainText = $("main, article, .content, .post, .article").text();
                    // Fallback to body text if no main tag is found
                    const textContent = mainText.trim() ? mainText : $("body").text();

                    // Clean up extra whitespace
                    const cleanedContent = textContent.replace(/\s+/g, ' ').trim();

                    if (cleanedContent) {
                        fullText = cleanedContent;
                        await db.news_articles.update({
                            where: { article_id: article.article_id },
                            data: { full_text: fullText }
                        });
                    }
                } catch (_e) {
                    console.warn("Could not fetch full text for", article.url);
                }
            }

            // If we still lack text, fallback to summary
            const textForLLM = fullText || article.summary || article.title;

            // Save selection
            const today = new Date();
            // Only one selection per article/tier/date constraint 
            try {
                const selectionObj = await db.news_selections.create({
                    data: {
                        article_id: article.article_id,
                        tier: sel.tier,
                        cycle_date: new Date(today.getFullYear(), today.getMonth(), today.getDate())
                    }
                });

                // Generate Questions
                const examinerPrompt = `
You are an expert reading comprehension teacher. Based on the following article, create exactly 3 multiple-choice questions.
Each question must have 4 options and test different aspects of comprehension (main idea, detail, inference).

Output ONLY a JSON array in the following format, with no other text or markdown:
[
  {
    "question_text": "text of the question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0, // integer 0-3
    "explanation": "Explanation for why the answer is correct"
  }
]

Article Title: ${article.title}
Article Content:
${textForLLM.substring(0, 10000)} // Truncated to prevent context blowout
`;

                const questionResponse = await openai.chat.completions.create({
                    model: EXAMINER_MODEL,
                    messages: [{ role: "user", content: examinerPrompt }],
                });

                const qContent = questionResponse.choices[0].message.content || "[]";
                let questionsParsed: Array<{ question_text: string, options: string[], correct_option_index: number, explanation: string }> = [];
                try {
                    questionsParsed = JSON.parse(qContent.replace(/```json|```/gi, '').trim());
                } catch (_err) {
                    console.warn("Failed to parse questions for article", article.article_id);
                    continue;
                }

                // Insert questions
                let qNum = 1;
                for (const q of questionsParsed) {
                    await db.news_questions.create({
                        data: {
                            selection_id: selectionObj.selection_id,
                            question_number: qNum++,
                            question_text: q.question_text,
                            options: q.options,
                            correct_option_index: q.correct_option_index,
                            explanation: q.explanation,
                            xp_reward: sel.tier * 10 // scale XP by bracket tier
                        }
                    });
                }
            } catch (_e) {
                console.warn("Error inserting selection or questions");
            }
        }

        return NextResponse.json({
            success: true,
            newArticlesFetched: newArticlesCount,
            articlesSelected: selectedList.length
        });

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown Error";
        console.error("Cron Job Error:", error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
