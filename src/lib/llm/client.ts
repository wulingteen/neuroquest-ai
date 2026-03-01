/**
 * Shared OpenRouter (OpenAI-compatible) client.
 *
 * Both the news and quiz pipelines use OpenRouter as the LLM gateway,
 * so we centralise the client here to avoid duplication and ensure
 * consistent configuration.
 */
import { OpenAI } from "openai";

/** Default LLM request timeout in milliseconds (2 minutes). */
export const LLM_TIMEOUT_MS = 120_000;

/**
 * Shared OpenAI-compatible client pointed at the OpenRouter gateway.
 * Uses the `OPENROUTER_API_KEY` environment variable.
 */
export const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "dummy_key",
    baseURL: "https://openrouter.ai/api/v1",
    timeout: LLM_TIMEOUT_MS,
    defaultHeaders: {
        "HTTP-Referer": "https://neuroquest.ai",
        "X-Title": "NeuroQuest AI",
    },
});
