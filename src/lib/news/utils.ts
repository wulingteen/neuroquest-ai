/** Retry an async function with exponential backoff. */
export async function retryAsync<T>(
    fn: () => Promise<T>,
    retries = 2,
    delayMs = 1000
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (e) {
            lastError = e;
            if (attempt < retries) {
                const wait = delayMs * 2 ** attempt;
                console.warn(`Retry ${attempt + 1}/${retries} after ${wait}ms: ${e instanceof Error ? e.message : e}`);
                await new Promise((r) => setTimeout(r, wait));
            }
        }
    }
    throw lastError;
}

/** Return midnight Date objects for the date range used by the cron job. */
export function getDateRange(): { yesterdayStart: Date; todayStart: Date; tomorrowStart: Date } {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 2);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    return { yesterdayStart, todayStart, tomorrowStart };
}

/** Strip markdown fences and parse JSON from an LLM response.
 *  Tries to extract the first JSON array or object if the model wraps it in prose. */
export function parseLLMJson<T>(raw: string): T {
    // Strip common markdown fences
    let cleaned = raw.replace(/```json|```/gi, "").trim();

    // Try to extract a JSON array [...] or object {...} if surrounded by prose
    const arrayMatch = cleaned.match(/(\[[\s\S]*\])/);
    const objectMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (arrayMatch) cleaned = arrayMatch[1];
    else if (objectMatch) cleaned = objectMatch[1];

    return JSON.parse(cleaned);
}

/** Normalize a title for fuzzy matching: lowercase, collapse whitespace,
 *  replace typographic punctuation with ASCII equivalents. */
export function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // smart single quotes → '
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // smart double quotes → "
        .replace(/[\u2013\u2014]/g, "-")                          // en/em dash → -
        .replace(/\u2026/g, "...")                                 // ellipsis char → ...
        .replace(/\s+/g, " ")
        .trim();
}
