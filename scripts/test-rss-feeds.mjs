#!/usr/bin/env node
/**
 * Test script: verify every RSS feed in the list can be fetched & parsed.
 * Includes Reddit JSON API adapter matching cron/route.ts logic.
 */
import Parser from "rss-parser";

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

function isRedditFeed(url) {
    return /reddit\.com\/r\//i.test(url);
}

async function fetchRedditJSON(url) {
    const jsonUrl = url
        .replace(/old\.reddit\.com/, "www.reddit.com")
        .replace(/\.(rss|xml)(\?.*)?$/, "/new.json?limit=50");

    const res = await fetch(jsonUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Reddit JSON status ${res.status}`);

    const json = await res.json();
    const posts = json?.data?.children || [];

    return {
        items: posts.map((child) => ({
            title: child.data.title || "",
            link: child.data.url || `https://www.reddit.com${child.data.permalink}`,
            pubDate: child.data.created_utc ? new Date(child.data.created_utc * 1000).toUTCString() : new Date().toUTCString(),
            contentSnippet: (child.data.selftext || "").substring(0, 500),
        })),
    };
}

const parser = new Parser({
    timeout: 20000,
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
});

const results = [];

for (let i = 0; i < RSS_FEEDS_LIST.length; i++) {
    const feed = RSS_FEEDS_LIST[i];
    const idx = String(i + 1).padStart(2, " ");
    const method = isRedditFeed(feed.url) ? "(JSON)" : "(RSS) ";
    process.stdout.write(`[${idx}/${RSS_FEEDS_LIST.length}] ${method} ${feed.name} … `);

    try {
        const parsed = isRedditFeed(feed.url)
            ? await fetchRedditJSON(feed.url)
            : await parser.parseURL(feed.url);

        const itemCount = (parsed.items || []).length;
        const sampleTitle = parsed.items?.[0]?.title || "(no items)";
        const hasPubDate = parsed.items?.[0]?.pubDate ? "✓" : "✗";
        const hasLink = parsed.items?.[0]?.link ? "✓" : "✗";

        console.log(`✅  ${itemCount} items | pubDate=${hasPubDate} link=${hasLink} | "${sampleTitle.substring(0, 60)}"`);
        results.push({ name: feed.name, status: "OK", items: itemCount, sample: sampleTitle });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`❌  ${msg.substring(0, 100)}`);
        results.push({ name: feed.name, status: "FAIL", error: msg.substring(0, 200) });
    }
}

// Summary
console.log("\n" + "═".repeat(80));
const ok = results.filter((r) => r.status === "OK");
const fail = results.filter((r) => r.status === "FAIL");
console.log(`\n✅ Passed: ${ok.length}/${results.length}`);
if (fail.length > 0) {
    console.log(`❌ Failed: ${fail.length}/${results.length}`);
    for (const f of fail) {
        console.log(`   - ${f.name}: ${f.error}`);
    }
} else {
    console.log("🎉 All feeds parsed successfully!");
}
