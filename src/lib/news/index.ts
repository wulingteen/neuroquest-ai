/**
 * News pipeline — barrel export.
 */
export { RSS_FEEDS_LIST, RANKER_MODEL, EXAMINER_MODEL, openai } from "./constants";
export { syncFeeds, fetchFeedArticles, type FeedScanResult } from "./feeds";
export { rankArticles, backfillFromUnselected, type RankedArticle } from "./ranker";
export { generateAndSaveQuestions, type ExaminerStats } from "./examiner";
export { fetchFullText, backfillFullText } from "./scraper";
export { getDateRange, normalizeTitle } from "./utils";
export { RANKER_PROMPT, EXAMINER_PROMPT } from "./prompts";
