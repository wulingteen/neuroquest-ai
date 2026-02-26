import Parser from "rss-parser";
import db from "@/lib/db";

const parser = new Parser({
    timeout: 15000,
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
});

function isRedditFeed(url: string): boolean {
    return /reddit\.com\/r\//i.test(url);
}

async function fetchRedditJSON(
    url: string
): Promise<{ items: Array<{ title: string; link: string; pubDate: string; contentSnippet: string }> }> {
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

/** Upsert all feeds from the list, disable any that were removed. */
export async function syncFeeds(feedsList: Array<{ name: string; url: string }>) {
    const currentUrls = feedsList.map((f) => f.url);
    for (const f of feedsList) {
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
}

export interface FeedScanResult {
    newArticlesCount: number;
    feedsOk: number;
    feedsFailed: number;
}

/** Process a single feed: fetch, parse, upsert articles, and log result. */
async function processSingleFeed(
    feed: { feed_id: bigint; url: string; name: string },
    scanRunId: bigint,
    yesterdayStart: Date
): Promise<{ articlesFound: number; ok: boolean }> {
    const feedStartTime = Date.now();
    try {
        const parsed = isRedditFeed(feed.url)
            ? await fetchRedditJSON(feed.url)
            : await parser.parseURL(feed.url);
        let feedArticlesFound = 0;

        for (const item of parsed.items || []) {
            if (!item.link || !item.title) continue;

            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
            if (pubDate < yesterdayStart) continue;

            try {
                await db.news_articles.create({
                    data: {
                        feed_id: feed.feed_id,
                        url: item.link,
                        title: item.title,
                        summary: item.contentSnippet || ("content" in item ? (item as Record<string, string>).content : "") || "",
                        published_at: pubDate,
                    },
                });
                feedArticlesFound++;
            } catch (e) {
                // Unique constraint violation (duplicate URL) — skip silently
                if (e instanceof Error && e.message.includes("Unique constraint")) continue;
                throw e;
            }
        }

        await db.rss_feeds.update({
            where: { feed_id: feed.feed_id },
            data: { last_fetched_at: new Date() },
        });

        await db.cron_scan_feed_logs.create({
            data: {
                run_id: scanRunId,
                feed_id: feed.feed_id,
                feed_url: feed.url,
                feed_name: feed.name,
                status: "success",
                articles_found: feedArticlesFound,
                duration_ms: Date.now() - feedStartTime,
            },
        });

        return { articlesFound: feedArticlesFound, ok: true };
    } catch (_e) {
        const errMsg = _e instanceof Error ? _e.message : String(_e);
        console.warn(`Failed to parse feed ${feed.url}: ${errMsg}`);

        await db.cron_scan_feed_logs.create({
            data: {
                run_id: scanRunId,
                feed_id: feed.feed_id,
                feed_url: feed.url,
                feed_name: feed.name,
                status: "failed",
                articles_found: 0,
                error_message: errMsg.substring(0, 1000),
                duration_ms: Date.now() - feedStartTime,
            },
        });

        return { articlesFound: 0, ok: false };
    }
}

const FEED_BATCH_SIZE = 5;

/** Fetch articles from all enabled feeds in parallel batches, filtering by date range. */
export async function fetchFeedArticles(
    feeds: Array<{ feed_id: bigint; url: string; name: string }>,
    scanRunId: bigint,
    yesterdayStart: Date
): Promise<FeedScanResult> {
    let newArticlesCount = 0;
    let feedsOk = 0;
    let feedsFailed = 0;

    for (let i = 0; i < feeds.length; i += FEED_BATCH_SIZE) {
        const batch = feeds.slice(i, i + FEED_BATCH_SIZE);
        const results = await Promise.allSettled(
            batch.map((feed) => processSingleFeed(feed, scanRunId, yesterdayStart))
        );

        for (const r of results) {
            if (r.status === "fulfilled") {
                newArticlesCount += r.value.articlesFound;
                if (r.value.ok) feedsOk++;
                else feedsFailed++;
            } else {
                feedsFailed++;
            }
        }
    }

    return { newArticlesCount, feedsOk, feedsFailed };
}
