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

/** Strip markdown fences and parse JSON from an LLM response. */
export function parseLLMJson<T>(raw: string): T {
    return JSON.parse(raw.replace(/```json|```/gi, "").trim());
}
