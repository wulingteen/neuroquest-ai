/**
 * POST /api/quiz/generate
 *
 * Generates new quiz questions for a specified planet using an LLM.
 *
 * Body (JSON):
 *   {
 *     "rollup": "prompt",          // planet rollup identifier
 *     "count": 5,                  // number of questions per level (1–20)
 *     "sameDifficulty": false,      // optional: all questions at same difficulty
 *     "levelCount": 4              // optional: number of difficulty levels (1–10)
 *   }
 *
 * Response: GenerationResult JSON
 */
import { NextResponse } from "next/server";
import { generateQuizQuestions } from "@/lib/quiz/generator";

/** Allow up to 120s for the LLM call in serverless environments. */
export const maxDuration = 120;

const MIN_COUNT = 1;
const MAX_COUNT = 20;
const MIN_LEVEL_COUNT = 1;
const MAX_LEVEL_COUNT = 10;

export async function POST(request: Request) {
    try {
        // ── Environment guard ────────────────────────────────────────────
        if (!process.env.OPENROUTER_API_KEY) {
            return NextResponse.json(
                { success: false, error: "Missing OPENROUTER_API_KEY in environment variables." },
                { status: 500 },
            );
        }

        // ── Parse body (guard against malformed JSON) ────────────────────
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: "Request body must be valid JSON." },
                { status: 400 },
            );
        }

        const { rollup, count, sameDifficulty, levelCount } = body as {
            rollup?: string;
            count?: number;
            sameDifficulty?: boolean;
            levelCount?: number;
        };

        // ── Validate rollup ──────────────────────────────────────────────
        if (!rollup || typeof rollup !== "string" || rollup.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: "Missing or invalid 'rollup' parameter (string, e.g. 'prompt')." },
                { status: 400 },
            );
        }

        // Guard against excessively long rollup values
        if (rollup.length > 50) {
            return NextResponse.json(
                { success: false, error: "'rollup' must be 50 characters or fewer." },
                { status: 400 },
            );
        }

        // ── Validate count ───────────────────────────────────────────────
        const parsedCount = Number(count);
        if (!Number.isInteger(parsedCount) || parsedCount < MIN_COUNT || parsedCount > MAX_COUNT) {
            return NextResponse.json(
                { success: false, error: `'count' must be an integer between ${MIN_COUNT} and ${MAX_COUNT}.` },
                { status: 400 },
            );
        }

        // ── Validate sameDifficulty (optional boolean) ───────────────────
        const useSameDifficulty = sameDifficulty === true;

        // ── Validate levelCount (optional integer 1–10) ──────────────────
        let parsedLevelCount: number | undefined;
        if (levelCount !== undefined && levelCount !== null) {
            parsedLevelCount = Number(levelCount);
            if (!Number.isInteger(parsedLevelCount) || parsedLevelCount < MIN_LEVEL_COUNT || parsedLevelCount > MAX_LEVEL_COUNT) {
                return NextResponse.json(
                    { success: false, error: `'levelCount' must be an integer between ${MIN_LEVEL_COUNT} and ${MAX_LEVEL_COUNT}.` },
                    { status: 400 },
                );
            }
        }

        // ── Run pipeline ─────────────────────────────────────────────────
        const result = await generateQuizQuestions({
            rollup: rollup.trim(),
            count: parsedCount,
            sameDifficulty: useSameDifficulty,
            levelCount: parsedLevelCount,
        });

        if (!result.success) {
            return NextResponse.json(result, { status: 422 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[quiz-gen] Unhandled route error:", error);
        const msg = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json(
            { success: false, error: msg },
            { status: 500 },
        );
    }
}
