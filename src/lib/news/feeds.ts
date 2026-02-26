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

/** Fetch articles from all enabled feeds, filtering by date range. */
export async function fetchFeedArticles(
    feeds: Array<{ feed_id: bigint; url: string; name: string }>,
    scanRunId: bigint,
    yesterdayStart: Date
): Promise<FeedScanResult> {
    let newArticlesCount = 0;
    let feedsOk = 0;
    let feedsFailed = 0;

    for (const feed of feeds) {
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
                    run_id: scanRunId,
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
        }
    }

    return { newArticlesCount, feedsOk, feedsFailed };
}
