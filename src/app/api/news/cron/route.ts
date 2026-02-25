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
    { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml" },
    { name: "Google AI Blog", url: "http://feeds.feedburner.com/blogspot/gJZg" },
    { name: "Google Research Blog", url: "https://research.google/blog/rss/" },
    { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
    { name: "TechCrunch AI", url: "https://techcrunch.com/tag/artificial-intelligence/feed/" },
    { name: "Amazon Science Blog", url: "https://www.amazon.science/index.rss" },
    { name: "Berkeley AI Research (BAIR) Blog", url: "https://bair.berkeley.edu/blog/feed.xml" },
    { name: "AI Weirdness", url: "https://aiweirdness.com/rss" },
    { name: "Medium – Artificial Intelligence Magazine", url: "https://becominghuman.ai/feed" },
    { name: "MIT AI News", url: "http://news.mit.edu/rss/topic/artificial-intelligence2" },
    { name: "NVIDIA AI Blog", url: "http://feeds.feedburner.com/nvidiablog" },
    { name: "AI Paper Review – David Stutz", url: "http://davidstutz.de/feed" },
    { name: "Microsoft Research Blog", url: "https://www.microsoft.com/en-us/research/feed" },
    { name: "fast.ai (NLP focus)", url: "https://www.fast.ai/index.xml" },
    { name: "JMLR recent papers", url: "http://www.jmlr.org/jmlr.xml" },
    { name: "Blog Distill", url: "https://distill.pub/rss.xml" },
    { name: "Blog inFERENCe", url: "https://www.inference.vc/rss/" },
    { name: "AI Reddit", url: "https://www.reddit.com/r/artificial/.rss" },
    { name: "Reddit NN, DL, ML", url: "https://www.reddit.com/r/neuralnetworks/.rss?format=xml" },
    { name: "Seita's Place (AI/ML)", url: "https://danieltakeshi.github.io/feed.xml" },
    { name: "Vitalab Literature Review", url: "https://vitalab.github.io/feed.xml" },
    { name: "Andrej Karpathy", url: "https://medium.com/feed/@karpathy" },
];

const apiKey = process.env.OPENROUTER_API_KEY;

const openai = new OpenAI({
    apiKey: apiKey || "dummy_key",
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "https://neuroquest.ai",
        "X-Title": "NeuroQuest AI",
    }
});

const RANKER_MODEL = "google/gemini-2.5-flash";
const EXAMINER_MODEL = "minimax/minimax-m2.5";

/** Check if a feed URL is a Reddit feed (RSS blocked, must use JSON API). */
function isRedditFeed(url: string): boolean {
    return /reddit\.com\/r\//i.test(url);
}

/** Fetch Reddit posts via JSON API and return items in the same shape as rss-parser. */
async function fetchRedditJSON(
    url: string
): Promise<{ items: Array<{ title: string; link: string; pubDate: string; contentSnippet: string }> }> {
    // Convert RSS URL to JSON: /r/foo/.rss → /r/foo/new.json?limit=50
    const jsonUrl = url
        .replace(/old\.reddit\.com/, "www.reddit.com")
        .replace(/\.(rss|xml)(\?.*)?$/, "/new.json?limit=50");

    const res = await fetch(jsonUrl, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Reddit JSON status ${res.status}`);

    const json = await res.json();
    const posts = json?.data?.children || [];

    const items = posts.map((child: { data: { title?: string; url?: string; permalink?: string; created_utc?: number; selftext?: string } }) => {
        const d = child.data;
        return {
            title: d.title || "",
            link: d.url || `https://www.reddit.com${d.permalink}`,
            pubDate: d.created_utc ? new Date(d.created_utc * 1000).toUTCString() : new Date().toUTCString(),
            contentSnippet: (d.selftext || "").substring(0, 500),
        };
    });

    return { items };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return midnight Date objects for yesterday and today (server-local time). */
function getDateRange(): { yesterdayStart: Date; todayStart: Date; tomorrowStart: Date } {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 2);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    return { yesterdayStart, todayStart, tomorrowStart };
}

/** Fetch the full-text of an article URL via cheerio scraping. */
async function fetchFullText(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        $("script, style, noscript, nav, header, footer, iframe, aside").remove();

        const mainText = $("main, article, .content, .post, .article").text();
        const textContent = mainText.trim() ? mainText : $("body").text();
        const cleaned = textContent.replace(/\s+/g, " ").trim();
        return cleaned || null;
    } catch (_e) {
        console.warn("Could not fetch full text for", url);
        return null;
    }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
    // Create scan run record immediately
    const scanRun = await db.cron_scan_runs.create({
        data: { status: "running" },
    });

    try {
        const parser = new Parser({
            timeout: 15000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "application/rss+xml, application/xml, text/xml, */*",
            },
        });

        if (!process.env.OPENROUTER_API_KEY) {
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: "failed", error_message: "Missing OPENROUTER_API_KEY", finished_at: new Date() },
            });
            return NextResponse.json({ error: "Missing OPENROUTER_API_KEY in environment variables." }, { status: 500 });
        }

        // ────────────────────────────────────────────────────────────────────
        // STEP 1 — Sync feed list & fetch RSS articles (yesterday + today)
        // ────────────────────────────────────────────────────────────────────
        const currentUrls = RSS_FEEDS_LIST.map((f) => f.url);
        for (const f of RSS_FEEDS_LIST) {
            await db.rss_feeds.upsert({
                where: { url: f.url },
                update: { enabled: true },
                create: { name: f.name, url: f.url },
            });
        }
        await db.rss_feeds.updateMany({
            where: { url: { notIn: currentUrls } },
            data: { enabled: false },
        });

        const feeds = await db.rss_feeds.findMany({ where: { enabled: true } });

        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: { total_feeds: feeds.length },
        });

        // ────────────────────────────────────────────────────────────────────
        // STEP 2 — Fetch new RSS articles, keeping yesterday + today only
        // ────────────────────────────────────────────────────────────────────
        const { yesterdayStart } = getDateRange();

        let newArticlesCount = 0;
        let feedsOk = 0;
        let feedsFailed = 0;

        for (const feed of feeds) {
            const feedStartTime = Date.now();
            try {
                // Reddit feeds block RSS with 403; use JSON API instead
                const parsed = isRedditFeed(feed.url)
                    ? await fetchRedditJSON(feed.url)
                    : await parser.parseURL(feed.url);
                let feedArticlesFound = 0;

                for (const item of parsed.items || []) {
                    if (!item.link || !item.title) continue;

                    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
                    // Only keep articles from yesterday or today
                    if (pubDate < yesterdayStart) continue;

                    const existing = await db.news_articles.findUnique({
                        where: { url: item.link },
                    });

                    if (!existing) {
                        await db.news_articles.create({
                            data: {
                                feed_id: feed.feed_id,
                                url: item.link,
                                title: item.title,
                                summary: item.contentSnippet || ("content" in item ? (item as Record<string, string>).content : "") || "",
                                published_at: pubDate,
                            },
                        });
                        newArticlesCount++;
                        feedArticlesFound++;
                    }
                }

                await db.rss_feeds.update({
                    where: { feed_id: feed.feed_id },
                    data: { last_fetched_at: new Date() },
                });

                feedsOk++;
                await db.cron_scan_feed_logs.create({
                    data: {
                        run_id: scanRun.run_id,
                        feed_id: feed.feed_id,
                        feed_url: feed.url,
                        feed_name: feed.name,
                        status: "success",
                        articles_found: feedArticlesFound,
                        duration_ms: Date.now() - feedStartTime,
                    },
                });
            } catch (_e) {
                const errMsg = _e instanceof Error ? _e.message : String(_e);
                console.warn(`Failed to parse feed ${feed.url}: ${errMsg}`);

                feedsFailed++;
                await db.cron_scan_feed_logs.create({
                    data: {
                        run_id: scanRun.run_id,
                        feed_id: feed.feed_id,
                        feed_url: feed.url,
                        feed_name: feed.name,
                        status: "failed",
                        articles_found: 0,
                        error_message: errMsg.substring(0, 1000),
                        duration_ms: Date.now() - feedStartTime,
                    },
                });
            }
        }

        // Update run with feed scan results
        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: { feeds_ok: feedsOk, feeds_failed: feedsFailed, articles_found: newArticlesCount },
        });

        // ────────────────────────────────────────────────────────────────────
        // STEP 3 — Collect ALL yesterday+today articles that haven't been
        //          selected yet and send their headlines to the ranker LLM.
        //          The LLM assigns 3 articles to each of 5 difficulty tiers
        //          (difficulty 1–5) and returns the titles.
        // ────────────────────────────────────────────────────────────────────
        const recentArticles = await db.news_articles.findMany({
            where: {
                published_at: { gte: yesterdayStart },
                news_selections: { none: {} },
            },
            select: { article_id: true, title: true, summary: true },
        });

        if (recentArticles.length === 0) {
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: "completed", articles_selected: 0, finished_at: new Date() },
            });
            return NextResponse.json({ message: "No new articles to rank.", run_id: scanRun.run_id.toString() });
        }

        // Cap at 200 to stay within context window
        const articlesToRank = recentArticles.slice(0, 200);

        // Build a concise headline list for the ranker
        const headlineList = articlesToRank.map((a, idx) => `${idx + 1}. ${a.title}`).join("\n");

        const rankerPrompt = `You are an expert content curator for an AI learning platform.

Below is a numbered list of news article headlines. Your task:
1. Read ALL headlines carefully.
2. Assign exactly 3 articles to EACH of 5 difficulty tiers:
   - Difficulty 1 (Beginner): simple news, easy to understand for newcomers
   - Difficulty 2 (Elementary): slightly technical but still accessible
   - Difficulty 3 (Intermediate): moderate technical depth
   - Difficulty 4 (Advanced): requires solid AI/ML background
   - Difficulty 5 (Expert): cutting-edge research or deep technical content
3. In total you must select exactly 15 articles (3 per tier). Each article may only appear in one tier.
4. If fewer than 15 articles are available, distribute as evenly as possible.

Return ONLY a valid JSON array in exactly this format (no markdown, no extra text):
[
  { "title": "exact article headline text", "difficulty": 1 },
  { "title": "exact article headline text", "difficulty": 1 },
  { "title": "exact article headline text", "difficulty": 1 },
  { "title": "exact article headline text", "difficulty": 2 },
  ...
]

The "title" field MUST exactly match one of the headlines below (character-for-character).
The "difficulty" field MUST be an integer from 1 to 5.

Headlines:
${headlineList}
`;

        const rankingResponse = await openai.chat.completions.create({
            model: RANKER_MODEL,
            messages: [{ role: "user", content: rankerPrompt }],
        });

        // ────────────────────────────────────────────────────────────────────
        // STEP 4 — Parse the ranker response: match titles back to article IDs
        // ────────────────────────────────────────────────────────────────────
        let rankerParsed: Array<{ title: string; difficulty: number }> = [];
        try {
            const raw = rankingResponse.choices[0].message.content || "[]";
            rankerParsed = JSON.parse(raw.replace(/```json|```/gi, "").trim());
        } catch (_e) {
            console.error("Failed to parse ranker LLM response", rankingResponse.choices[0].message.content);
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: "failed", error_message: "Ranking LLM failed to output JSON", finished_at: new Date() },
            });
            return NextResponse.json(
                { error: "Ranking LLM failed to output JSON", run_id: scanRun.run_id.toString() },
                { status: 500 }
            );
        }

        // Build a title→article map for fast lookup (case-insensitive, trimmed)
        const titleToArticle = new Map<string, (typeof articlesToRank)[0]>();
        for (const a of articlesToRank) {
            titleToArticle.set(a.title.trim().toLowerCase(), a);
        }

        // Resolve each ranker selection to a concrete article + tier
        const selectedArticles: Array<{ articleId: bigint; title: string; tier: number }> = [];

        for (const item of rankerParsed) {
            const tier = Math.max(1, Math.min(5, Math.round(Number(item.difficulty))));
            const normalizedTitle = (item.title || "").trim().toLowerCase();

            const matched = titleToArticle.get(normalizedTitle);
            if (!matched) {
                console.warn(`Ranker returned unmatched title: "${item.title}"`);
                continue;
            }

            // Avoid duplicates
            if (selectedArticles.some((s) => s.articleId === matched.article_id)) continue;

            selectedArticles.push({ articleId: matched.article_id, title: matched.title, tier });
        }

        if (selectedArticles.length === 0) {
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: "completed", articles_selected: 0, finished_at: new Date() },
            });
            return NextResponse.json({
                message: "Ranker returned no matching articles.",
                run_id: scanRun.run_id.toString(),
            });
        }

        // ────────────────────────────────────────────────────────────────────
        // STEP 5 — For each selected article, SEQUENTIALLY:
        //          a) fetch full content (if not cached)
        //          b) send to examiner LLM → 3 questions
        //          c) persist selection + questions to DB
        // ────────────────────────────────────────────────────────────────────
        const today = new Date();
        const cycleDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        for (const sel of selectedArticles) {
            const article = await db.news_articles.findUnique({
                where: { article_id: sel.articleId },
            });
            if (!article) continue;

            // -- Fetch full text if missing --
            let fullText = article.full_text;
            if (!fullText) {
                const scraped = await fetchFullText(article.url);
                if (scraped) {
                    fullText = scraped;
                    await db.news_articles.update({
                        where: { article_id: article.article_id },
                        data: { full_text: fullText },
                    });
                }
            }

            const textForLLM = fullText || article.summary || article.title;

            try {
                // -- Insert news_selection row --
                const selectionObj = await db.news_selections.create({
                    data: {
                        article_id: article.article_id,
                        tier: sel.tier,
                        cycle_date: cycleDate,
                    },
                });

                // -- Generate 3 questions via the examiner LLM --
                const examinerPrompt = `You are an expert reading comprehension teacher. Based on the following article, create exactly 3 multiple-choice questions.
Each question must have exactly 4 options and test different aspects of comprehension (main idea, detail, inference).

Return ONLY a valid JSON array in exactly this format, with no other text or markdown:
[
  {
    "question_text": "text of the question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "Explanation for why the answer is correct"
  }
]

Rules:
- "correct_option_index" must be an integer from 0 to 3 corresponding to the correct option.
- Provide exactly 3 question objects in the array.

Article Title: ${article.title}
Article Content:
${textForLLM.substring(0, 10000)}`;

                const questionResponse = await openai.chat.completions.create({
                    model: EXAMINER_MODEL,
                    messages: [{ role: "user", content: examinerPrompt }],
                });

                const qContent = questionResponse.choices[0].message.content || "[]";
                let questionsParsed: Array<{
                    question_text: string;
                    options: string[];
                    correct_option_index: number;
                    explanation: string;
                }> = [];

                try {
                    questionsParsed = JSON.parse(qContent.replace(/```json|```/gi, "").trim());
                } catch (_err) {
                    console.warn("Failed to parse questions for article", article.article_id.toString());
                    continue;
                }

                // -- Persist questions --
                let qNum = 1;
                for (const q of questionsParsed) {
                    if (qNum > 3) break; // strict cap at 3
                    await db.news_questions.create({
                        data: {
                            selection_id: selectionObj.selection_id,
                            question_number: qNum++,
                            question_text: q.question_text,
                            options: q.options,
                            correct_option_index: q.correct_option_index,
                            explanation: q.explanation,
                            xp_reward: sel.tier * 10,
                        },
                    });
                }
            } catch (_e) {
                const selErrMsg = _e instanceof Error ? _e.message : String(_e);
                console.warn(
                    `Error processing article "${sel.title}" (tier ${sel.tier}):`,
                    selErrMsg
                );
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STEP 6 — Finalize scan run
        // ────────────────────────────────────────────────────────────────────
        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: {
                status: "completed",
                articles_selected: selectedArticles.length,
                finished_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            run_id: scanRun.run_id.toString(),
            newArticlesFetched: newArticlesCount,
            articlesSelected: selectedArticles.length,
            feedsOk,
            feedsFailed,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown Error";
        console.error("Cron Job Error:", error);

        await db.cron_scan_runs
            .update({
                where: { run_id: scanRun.run_id },
                data: { status: "failed", error_message: msg.substring(0, 1000), finished_at: new Date() },
            })
            .catch(() => { }); // Don't let this error swallow the original

        return NextResponse.json({ error: msg, run_id: scanRun.run_id.toString() }, { status: 500 });
    }
}
