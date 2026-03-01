/**
 * Generic LLM helper utilities shared across pipelines.
 *
 * These were originally in `src/lib/news/utils.ts` but are consumed by
 * both the news and quiz modules, so they belong in a shared location.
 */

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

/** Strip markdown fences and parse JSON from an LLM response.
 *  Tries to extract the first JSON array or object if the model wraps it in prose. */
export function parseLLMJson<T>(raw: string): T {
    // Strip common markdown fences
    const cleaned = raw.replace(/```json|```/gi, "").trim();

    // 1. Try parsing the full cleaned string first — this preserves wrapper
    //    objects like { "levels": [...] } that would otherwise be lost when
    //    the regex extracts only the inner array.
    try {
        return JSON.parse(cleaned);
    } catch {
        // Fall through to regex extraction
    }

    // 2. Fallback: extract a JSON array [...] or object {...} from prose
    const arrayMatch = cleaned.match(/(\[[\s\S]*\])/);
    const objectMatch = cleaned.match(/(\{[\s\S]*\})/);
    let extracted = cleaned;
    if (arrayMatch) extracted = arrayMatch[1];
    else if (objectMatch) extracted = objectMatch[1];

    return JSON.parse(extracted);
}
