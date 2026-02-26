import * as cheerio from "cheerio";
import db from "@/lib/db";
import type { Browser } from "puppeteer";

const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Extract article text from raw HTML using cheerio (no jsdom/ESM issues). */
function extractWithReadability(html: string, _url: string): Promise<string | null> {
    const $ = cheerio.load(html);

    // Remove noise elements
    $("script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar, .menu, .nav, .cookie, .popup, .modal, .social, .share, .related, .comments, noscript, iframe").remove();

    // Try article body selectors in priority order
    const selectors = ["article", '[role="main"]', "main", ".article-body", ".article-content", ".post-content", ".entry-content", ".story-body", "#article-body", "#main-content", ".content"];
    for (const sel of selectors) {
        const el = $(sel).first();
        if (el.length) {
            const text = el
                .find("p")
                .map((_, p) => $(p).text().trim())
                .get()
                .filter((t) => t.length > 40)
                .join(" ");
            if (text.length > 200) return Promise.resolve(text.replace(/\s+/g, " ").trim());
        }
    }

    // Fallback: collect all paragraphs from the page
    const text = $("p")
        .map((_, p) => $(p).text().trim())
        .get()
        .filter((t) => t.length > 40)
        .join(" ");
    return Promise.resolve(text.length > 200 ? text.replace(/\s+/g, " ").trim() : null);
}

/** Extract OpenGraph / meta description as last-resort fallback. */
function extractMetaContent(html: string): string | null {
    const $ = cheerio.load(html);
    const ogDesc = $('meta[property="og:description"]').attr("content");
    const metaDesc = $('meta[name="description"]').attr("content");
    const text = ogDesc || metaDesc || null;
    return text && text.length > 50 ? text : null;
}

/**
 * Tier 1: Fetch HTML with plain HTTP and extract with Readability.
 */
async function fetchTier1(url: string): Promise<{ text: string | null; html: string | null; needsBrowser: boolean }> {
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
            redirect: "follow",
            signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) {
            console.warn(`Scraper HTTP ${res.status} for ${url}`);
            return { text: null, html: null, needsBrowser: res.status === 403 || res.status === 401 };
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("html") && !contentType.includes("xml") && !contentType.includes("text")) {
            return { text: null, html: null, needsBrowser: false };
        }

        const html = await res.text();
        const text = await extractWithReadability(html, url);
        return { text, html, needsBrowser: !text };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`Tier1 fetch failed for ${url}: ${msg}`);
        return { text: null, html: null, needsBrowser: true };
    }
}

/**
 * Tier 2: Use Puppeteer headless browser to render the page, then extract with Readability.
 */
async function fetchTier2(url: string, browser: Browser): Promise<string | null> {
    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        const html = await page.content();
        return await extractWithReadability(html, url);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`Tier2 Puppeteer failed for ${url}: ${msg}`);
        return null;
    } finally {
        await page?.close().catch(() => {});
    }
}

/**
 * Fetch full article text using a 3-tier strategy:
 *   1. Plain HTTP fetch + Readability
 *   2. Puppeteer headless browser + Readability (if tier 1 fails)
 *   3. Meta tag fallback (og:description / meta description)
 */
export async function fetchFullText(url: string, browser?: Browser): Promise<string | null> {
    // Tier 1 — plain fetch + Readability
    const t1 = await fetchTier1(url);
    if (t1.text) return t1.text;

    // Tier 2 — Puppeteer (only if browser instance provided and tier 1 suggests it's needed)
    if (browser && t1.needsBrowser) {
        console.log(`Tier2 Puppeteer for ${url}`);
        const t2 = await fetchTier2(url, browser);
        if (t2) return t2;
    }

    // Tier 3 — meta tag fallback from whatever HTML we got
    if (t1.html) {
        const meta = extractMetaContent(t1.html);
        if (meta) return meta;
    }

    return null;
}

/**
 * Fetch full_text for all articles that are missing it.
 * Launches a single Puppeteer browser for the entire batch.
 */
export async function backfillFullText(articleIds?: bigint[]) {
    const where: Record<string, unknown> = {
        OR: [{ full_text: null }, { full_text: "" }],
    };
    if (articleIds?.length) {
        where.article_id = { in: articleIds };
    }

    const articles = await db.news_articles.findMany({
        where,
        select: { article_id: true, url: true },
    });

    if (articles.length === 0) return { total: 0, fetched: 0, failed: 0 };

    // Dynamically import and launch Puppeteer
    let browser: Browser | undefined;
    try {
        const puppeteer = await import("puppeteer");
        browser = await puppeteer.default.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    } catch (e) {
        console.warn("Puppeteer launch failed, proceeding without browser fallback:", e instanceof Error ? e.message : e);
    }

    let fetched = 0;
    let failed = 0;
    const BATCH_SIZE = 3;

    try {
        for (let i = 0; i < articles.length; i += BATCH_SIZE) {
            const batch = articles.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
                batch.map(async (a) => {
                    const text = await fetchFullText(a.url, browser);
                    if (text) {
                        await db.news_articles.update({
                            where: { article_id: a.article_id },
                            data: { full_text: text },
                        });
                        return true;
                    }
                    return false;
                })
            );
            for (const r of results) {
                if (r.status === "fulfilled" && r.value) fetched++;
                else failed++;
            }
        }
    } finally {
        await browser?.close().catch(() => {});
    }

    console.log(`Backfill complete: ${fetched}/${articles.length} articles fetched, ${failed} failed`);
    return { total: articles.length, fetched, failed };
}
