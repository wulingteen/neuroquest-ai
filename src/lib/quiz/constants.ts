/**
 * Quiz question generation pipeline — constants.
 *
 * Re-uses the shared OpenRouter client from `@/lib/llm`.
 */
export { openai } from "@/lib/llm";

/** Model used for quiz question generation. */
export const QUIZ_GENERATOR_MODEL = "deepseek/deepseek-v3.2";

/** Maximum number of existing questions to include in the context window.
 *  Prevents token overflow when a planet has hundreds of questions. */
export const MAX_CONTEXT_QUESTIONS = 80;
