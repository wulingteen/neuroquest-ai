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
    { name: "Blog inFERENCe", url: "https://www.inference.vc/rss/" }
];

// Using PrismaClient from config
const apiKey = process.env.OPENROUTER_API_KEY;

const openai = new OpenAI({
    apiKey: apiKey || "dummy_key",
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
    // Create scan run record immediately
    const scanRun = await db.cron_scan_runs.create({
        data: { status: 'running' }
    });

    try {
        const parser = new Parser({
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
        });

        if (!process.env.OPENROUTER_API_KEY) {
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: 'failed', error_message: 'Missing OPENROUTER_API_KEY', finished_at: new Date() }
            });
            return NextResponse.json({ error: "Missing OPENROUTER_API_KEY in environment variables." }, { status: 500 });
        }

        // 1. Ensure feeds are in DB and sync enabled state
        const currentUrls = RSS_FEEDS_LIST.map(f => f.url);
        for (const f of RSS_FEEDS_LIST) {
            await db.rss_feeds.upsert({
                where: { url: f.url },
                update: { enabled: true },
                create: { name: f.name, url: f.url },
            });
        }

        // Disable any stale feed URLs that are no longer in RSS_FEEDS_LIST
        await db.rss_feeds.updateMany({
            where: { url: { notIn: currentUrls } },
            data: { enabled: false },
        });

        const feeds = await db.rss_feeds.findMany({ where: { enabled: true } });

        // Update total feeds count
        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: { total_feeds: feeds.length }
        });

        // 2. Fetch new RSS articles
        let newArticlesCount = 0;
        let feedsOk = 0;
        let feedsFailed = 0;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        for (const feed of feeds) {
            const feedStartTime = Date.now();
            try {
                const parsed = await parser.parseURL(feed.url);
                let feedArticlesFound = 0;

                for (const item of parsed.items || []) {
                    if (!item.link || !item.title) continue;

                    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
                    // Skip if article is from a previous day
                    if (pubDate < todayStart) continue;

                    const existing = await db.news_articles.findUnique({
                        where: { url: item.link }
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
                        feedArticlesFound++;
                    }
                }
                await db.rss_feeds.update({
                    where: { feed_id: feed.feed_id },
                    data: { last_fetched_at: new Date() }
                });

                // Log success
                feedsOk++;
                await db.cron_scan_feed_logs.create({
                    data: {
                        run_id: scanRun.run_id,
                        feed_id: feed.feed_id,
                        feed_url: feed.url,
                        feed_name: feed.name,
                        status: 'success',
                        articles_found: feedArticlesFound,
                        duration_ms: Date.now() - feedStartTime,
                    }
                });
            } catch (_e) {
                const errMsg = _e instanceof Error ? _e.message : String(_e);
                console.warn(`Failed to parse feed ${feed.url}: ${errMsg}`);

                // Log failure
                feedsFailed++;
                await db.cron_scan_feed_logs.create({
                    data: {
                        run_id: scanRun.run_id,
                        feed_id: feed.feed_id,
                        feed_url: feed.url,
                        feed_name: feed.name,
                        status: 'failed',
                        articles_found: 0,
                        error_message: errMsg.substring(0, 1000),
                        duration_ms: Date.now() - feedStartTime,
                    }
                });
            }
        }

        // Update run with feed scan results
        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: { feeds_ok: feedsOk, feeds_failed: feedsFailed, articles_found: newArticlesCount }
        });

        // 3. Select articles for today using LLM
        const recentArticles = await db.news_articles.findMany({
            where: {
                published_at: { gte: todayStart },
                news_selections: { none: {} }
            },
            select: { article_id: true, title: true, summary: true }
        });

        if (recentArticles.length === 0) {
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: 'completed', articles_selected: 0, finished_at: new Date() }
            });
            return NextResponse.json({ message: "No new articles to rank.", run_id: scanRun.run_id.toString() });
        }

        const articlesToRank = recentArticles.slice(0, 200);
        const articlesJSON = articlesToRank.map(a => ({
            id: a.article_id.toString(),
            title: a.title,
            summary: a.summary?.substring(0, 200)
        }));

        const rankerPrompt = `
You are an expert content curator. I will provide a JSON array of news articles with their 'id', 'title', and 'summary'.
1. Evaluate each article based on its difficulty, interest, and relevance to AI reading comprehension.
2. Assign each article a score from 0 to 100.
3. Group them into 10 score tiers (0 through 9):
   Tier 0: score 0-10
   Tier 1: score 11-20
   Tier 2: score 21-30
   Tier 3: score 31-40
   Tier 4: score 41-50
   Tier 5: score 51-60
   Tier 6: score 61-70
   Tier 7: score 71-80
   Tier 8: score 81-90
   Tier 9: score 91-100
4. From each tier, select exactly 3 articles (if a tier doesn't have 3, pick as many as available).
5. Output ONLY valid JSON in the form:
[
  { "id": "integer string", "tier": 0 }
]
Where "tier" is an integer from 0 to 9. Do not output markdown code blocks or any extra text, ONLY the JSON array.
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
            // Normalise tier values: LLM may return 1-10 instead of 0-9
            selectedList = selectedList.map(s => ({
                ...s,
                tier: Math.max(0, Math.min(9, typeof s.tier === 'number' ? s.tier : Number(s.tier)))
            }));
        } catch (_e) {
            console.error("Failed to parse LLM ranking response", rankingResponse.choices[0].message.content);
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: 'failed', error_message: 'Ranking LLM failed to output JSON', finished_at: new Date() }
            });
            return NextResponse.json({ error: "Ranking LLM failed to output JSON", run_id: scanRun.run_id.toString() }, { status: 500 });
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
                try {
                    const res = await fetch(article.url, {
                        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
                        redirect: "follow",
                        signal: AbortSignal.timeout(10000)
                    });
                    const html = await res.text();
                    const $ = cheerio.load(html);

                    $("script, style, noscript, nav, header, footer, iframe, aside").remove();

                    const mainText = $("main, article, .content, .post, .article").text();
                    const textContent = mainText.trim() ? mainText : $("body").text();

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

            const textForLLM = fullText || article.summary || article.title;

            const today = new Date();
            try {
                const selectionObj = await db.news_selections.create({
                    data: {
                        article_id: article.article_id,
                        tier: sel.tier,
                        cycle_date: new Date(today.getFullYear(), today.getMonth(), today.getDate())
                    }
                });

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
                            xp_reward: sel.tier * 10
                        }
                    });
                }
            } catch (_e) {
                const selErrMsg = _e instanceof Error ? _e.message : String(_e);
                console.warn(`Error inserting selection or questions for article ${sel.id}, tier ${sel.tier}:`, selErrMsg);
            }
        }

        // Finalize scan run as completed
        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: {
                status: 'completed',
                articles_selected: selectedList.length,
                finished_at: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            run_id: scanRun.run_id.toString(),
            newArticlesFetched: newArticlesCount,
            articlesSelected: selectedList.length,
            feedsOk,
            feedsFailed,
        });

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown Error";
        console.error("Cron Job Error:", error);

        // Mark scan run as failed
        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: { status: 'failed', error_message: msg.substring(0, 1000), finished_at: new Date() }
        }).catch(() => { }); // Don't let this error swallow the original

        return NextResponse.json({ error: msg, run_id: scanRun.run_id.toString() }, { status: 500 });
    }
}
