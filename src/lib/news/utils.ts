/**
 * News-pipeline-specific utility functions.
 *
 * Generic LLM helpers (retryAsync, parseLLMJson) have been moved to
 * `@/lib/llm/helpers`. They are re-exported here for backward compatibility
 * with existing imports within the news module.
 */

// Re-export shared LLM helpers so intra-module imports keep working
export { retryAsync, parseLLMJson } from "@/lib/llm/helpers";

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
