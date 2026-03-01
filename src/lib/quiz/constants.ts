/**
 * Quiz question generation pipeline — constants & shared OpenAI client.
 *
 * Re-uses the same OpenRouter gateway that the news pipeline uses so we only
 * need one API key (OPENROUTER_API_KEY).
 */
import { OpenAI } from "openai";

/** Model used for quiz question generation. */
export const QUIZ_GENERATOR_MODEL = "minimax/minimax-m2.5";

/** Maximum number of existing questions to include in the context window.
 *  Prevents token overflow when a planet has hundreds of questions. */
export const MAX_CONTEXT_QUESTIONS = 80;

/** LLM request timeout in milliseconds (2 minutes). */
export const LLM_TIMEOUT_MS = 120_000;

/** Shared OpenRouter client — identical config to the news pipeline. */
export const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "dummy_key",
    baseURL: "https://openrouter.ai/api/v1",
    timeout: LLM_TIMEOUT_MS,
    defaultHeaders: {
        "HTTP-Referer": "https://neuroquest.ai",
        "X-Title": "NeuroQuest AI",
    },
});
