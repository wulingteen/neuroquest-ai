import * as cheerio from "cheerio";

/** Fetch the full-text of an article URL via cheerio scraping. */
export async function fetchFullText(url: string): Promise<string | null> {
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
