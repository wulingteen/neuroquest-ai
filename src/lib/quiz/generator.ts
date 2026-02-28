/**
 * Core quiz question generation pipeline.
 *
 * Flow:
 *  1. Validate the target planet rollup exists.
 *  2. Fetch all existing quiz_questions for that planet (sorted by question_id).
 *  3. Call the LLM with existing questions + planet context.
 *  4. Parse & validate the response.
 *  5. Create a new level (max level_number + 1) for this batch.
 *  6. Compute `xp_reward` per question based on difficulty rank.
 *  7. Insert the level and questions into the database inside a transaction.
 */
import db from "@/lib/db";
import { openai, QUIZ_GENERATOR_MODEL } from "./constants";
import { buildQuizGeneratorPrompt, type ExistingQuestion, type PlanetInfo } from "./prompts";
import { parseLLMJson, retryAsync } from "@/lib/news/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneratedQuestion {
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string;
}

export interface GenerationOptions {
    /** Planet rollup identifier (e.g. "prompt"). */
    rollup: string;
    /** Number of questions to generate (1–20). */
    count: number;
    /**
     * When true, all generated questions will be at the same advanced
     * difficulty level instead of ranging from easy to hard.
     * Default: false (ascending difficulty).
     */
    sameDifficulty?: boolean;
}

export interface GenerationResult {
    success: boolean;
    planet: string;
    questionsRequested: number;
    questionsInserted: number;
    skippedDuplicates: number;
    levelNumber: number;
    sameDifficulty: boolean;
    questions: Array<{
        question_id: number;
        level_number: number;
        question_number: number;
        question_text: string;
        xp_reward: number;
    }>;
    error?: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/** Maximum allowed length for a single question text string. */
const MAX_QUESTION_TEXT_LENGTH = 2000;
/** Maximum allowed length for a single option or explanation. */
const MAX_FIELD_LENGTH = 1000;

function isValidGeneratedQuestion(q: unknown): q is GeneratedQuestion {
    if (typeof q !== "object" || q === null) return false;
    const obj = q as Record<string, unknown>;
    return (
        typeof obj.question_text === "string" &&
        obj.question_text.trim().length > 0 &&
        obj.question_text.length <= MAX_QUESTION_TEXT_LENGTH &&
        Array.isArray(obj.options) &&
        obj.options.length === 4 &&
        obj.options.every(
            (o: unknown) => typeof o === "string" && o.length > 0 && o.length <= MAX_FIELD_LENGTH,
        ) &&
        typeof obj.correct_option_index === "number" &&
        Number.isInteger(obj.correct_option_index) &&
        obj.correct_option_index >= 0 &&
        obj.correct_option_index <= 3 &&
        typeof obj.explanation === "string" &&
        obj.explanation.length <= MAX_FIELD_LENGTH
    );
}

/**
 * Detect near-duplicate questions using normalised text comparison.
 * Returns true if `text` is too similar to any question in `existing`.
 */
function isDuplicate(text: string, existing: ExistingQuestion[]): boolean {
    const normalised = text.toLowerCase().replace(/\s+/g, " ").trim();
    return existing.some((q) => {
        const existNorm = q.question_text.toLowerCase().replace(/\s+/g, " ").trim();
        return existNorm === normalised;
    });
}

// ─── XP Reward Calculation ───────────────────────────────────────────────────

/**
 * Calculate XP reward for a question based on its difficulty rank.
 *
 * **Ascending mode** (sameDifficulty = false):
 *   xp = BASE_XP + existingCount * BONUS + position * STEP_XP + position² * CURVE
 *   → produces an escalating curve within the batch.
 *
 * **Uniform mode** (sameDifficulty = true):
 *   xp = BASE_XP + existingCount * BONUS + count * STEP_XP
 *   → all questions in the batch receive the same (high) reward.
 */
const BASE_XP = 100;
const STEP_XP = 50;
const CURVE_FACTOR = 10;
const EXISTING_BONUS_PER_QUESTION = 5;

export function calculateXpReward(
    position: number,
    existingCount: number,
    sameDifficulty: boolean,
    batchSize: number,
): number {
    const base = BASE_XP + existingCount * EXISTING_BONUS_PER_QUESTION;
    if (sameDifficulty) {
        // Uniform reward: use the batch midpoint as the fixed position
        const midpoint = Math.floor(batchSize / 2);
        return base + midpoint * STEP_XP + Math.floor(midpoint * midpoint * CURVE_FACTOR);
    }
    return base + position * STEP_XP + Math.floor(position * position * CURVE_FACTOR);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fail(rollup: string, count: number, sameDifficulty: boolean, error: string): GenerationResult {
    return {
        success: false,
        planet: rollup,
        questionsRequested: count,
        questionsInserted: 0,
        skippedDuplicates: 0,
        levelNumber: 0,
        sameDifficulty,
        questions: [],
        error,
    };
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export async function generateQuizQuestions(
    options: GenerationOptions,
): Promise<GenerationResult> {
    const { rollup, count, sameDifficulty = false } = options;

    // ────────────────────────────────────────────────────────────────────
    // 1. Validate rollup
    // ────────────────────────────────────────────────────────────────────
    const planet = await db.planets.findUnique({ where: { rollup } });
    if (!planet) {
        return fail(rollup, count, sameDifficulty, `Planet with rollup "${rollup}" not found.`);
    }

    const planetInfo: PlanetInfo = {
        rollup: planet.rollup,
        label: planet.label,
        subtitle: planet.subtitle,
        description: planet.description,
    };

    // ────────────────────────────────────────────────────────────────────
    // 2. Fetch existing questions for context
    // ────────────────────────────────────────────────────────────────────
    const existingRaw = await db.quiz_questions.findMany({
        where: { rollup },
        orderBy: { question_id: "asc" },
    });

    const existingQuestions: ExistingQuestion[] = existingRaw.map((q) => ({
        question_id: q.question_id,
        level_number: q.level_number,
        question_number: q.question_number,
        question_text: q.question_text,
        options: q.options as string[],
        correct_option_index: q.correct_option_index,
        explanation: q.explanation,
        xp_reward: q.xp_reward,
    }));

    // ────────────────────────────────────────────────────────────────────
    // 3. Call LLM
    // ────────────────────────────────────────────────────────────────────
    const prompt = buildQuizGeneratorPrompt(planetInfo, existingQuestions, count, sameDifficulty);

    let llmResponse: string;
    try {
        const completion = await retryAsync(
            () =>
                openai.chat.completions.create({
                    model: QUIZ_GENERATOR_MODEL,
                    messages: [{ role: "user", content: prompt }],
                }),
            2,   // retries
            2000, // initial delay between retries
        );
        llmResponse = completion.choices?.[0]?.message?.content || "[]";
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown LLM error";
        console.error(`[quiz-gen] LLM call failed for "${rollup}":`, msg);
        return fail(rollup, count, sameDifficulty, `LLM call failed: ${msg}`);
    }

    // ────────────────────────────────────────────────────────────────────
    // 4. Parse & validate
    // ────────────────────────────────────────────────────────────────────
    let parsed: unknown[];
    try {
        parsed = parseLLMJson(llmResponse);
    } catch (parseErr) {
        console.error(`[quiz-gen] JSON parse error for "${rollup}":`, parseErr);
        return fail(rollup, count, sameDifficulty, "Failed to parse LLM JSON response.");
    }

    if (!Array.isArray(parsed)) {
        return fail(rollup, count, sameDifficulty, "LLM response was not an array.");
    }

    // Filter to valid questions and detect duplicates
    let skippedDuplicates = 0;
    const validQuestions: GeneratedQuestion[] = [];

    for (const raw of parsed) {
        if (!isValidGeneratedQuestion(raw)) {
            console.warn(`[quiz-gen] Skipping invalid question structure for "${rollup}".`);
            continue;
        }
        if (isDuplicate(raw.question_text, existingQuestions)) {
            console.warn(`[quiz-gen] Skipping duplicate question for "${rollup}": "${raw.question_text.substring(0, 60)}…"`);
            skippedDuplicates++;
            continue;
        }
        validQuestions.push(raw);
    }

    if (validQuestions.length === 0) {
        return fail(rollup, count, sameDifficulty, "No valid, non-duplicate questions in LLM response.");
    }

    // ────────────────────────────────────────────────────────────────────
    // 5. New level_number = max(quiz_questions.level_number) + 1
    //    Derived from quiz_questions only — the source of truth for
    //    question data on this planet.
    // ────────────────────────────────────────────────────────────────────
    const maxQForPlanet = await db.quiz_questions.findFirst({
        where: { rollup },
        orderBy: { level_number: "desc" },
        select: { level_number: true },
    });
    const newLevelNumber = (maxQForPlanet?.level_number ?? 0) + 1;

    // The levels table may already have a row at this level_number
    // (orphaned from a previous generation whose questions were deleted).
    // Use upsert to handle both cases cleanly.
    const maxLevelGlobal = await db.levels.findFirst({
        orderBy: { level_id: "desc" },
    });
    const newLevelId = (maxLevelGlobal?.level_id ?? 0) + 1;

    // ────────────────────────────────────────────────────────────────────
    // 6 & 7. Compute XP and insert level + questions in a transaction
    // ────────────────────────────────────────────────────────────────────
    const batchSize = validQuestions.length;
    const avgXp = calculateXpReward(Math.floor(batchSize / 2), existingQuestions.length, sameDifficulty, batchSize);

    const questionData = validQuestions.map((q, i) => ({
        rollup,
        level_number: newLevelNumber,
        question_number: i + 1,
        question_text: q.question_text.trim(),
        options: q.options.map((o) => o.trim()),
        correct_option_index: q.correct_option_index,
        explanation: q.explanation.trim(),
        xp_reward: calculateXpReward(i, existingQuestions.length, sameDifficulty, batchSize),
    }));

    try {
        const levelTitle = sameDifficulty
            ? `${planet.label} — Advanced Assessment ${newLevelNumber}`
            : `${planet.label} — Level ${newLevelNumber}`;

        const levelUpsert = db.levels.upsert({
            where: { rollup_level_number: { rollup, level_number: newLevelNumber } },
            create: {
                level_id: newLevelId,
                rollup,
                level_number: newLevelNumber,
                title: levelTitle,
                content_type: "quiz",
                xp_reward: avgXp,
            },
            update: {
                title: levelTitle,
                content_type: "quiz",
                xp_reward: avgXp,
            },
        });

        const txOps = [
            // Upsert the level row (satisfies FK, handles orphaned rows)
            levelUpsert,
            // Then insert all questions
            ...questionData.map((data) => db.quiz_questions.create({ data })),
        ];

        const [, ...createdQuestions] = await db.$transaction(txOps);

        const insertedQuestions: GenerationResult["questions"] = createdQuestions.map((r) => {
            const rec = r as { question_id: number; level_number: number; question_number: number; question_text: string; xp_reward: number };
            return {
                question_id: rec.question_id,
                level_number: rec.level_number,
                question_number: rec.question_number,
                question_text: rec.question_text,
                xp_reward: rec.xp_reward,
            };
        });

        console.log(
            `[quiz-gen] ✅ ${insertedQuestions.length}/${validQuestions.length} questions inserted for "${rollup}" ` +
            `at level_number ${newLevelNumber} (${skippedDuplicates} duplicates skipped, ` +
            `sameDifficulty=${sameDifficulty}).`,
        );

        return {
            success: true,
            planet: rollup,
            questionsRequested: count,
            questionsInserted: insertedQuestions.length,
            skippedDuplicates,
            levelNumber: newLevelNumber,
            sameDifficulty,
            questions: insertedQuestions,
        };
    } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : String(txErr);
        console.error(`[quiz-gen] Transaction failed for "${rollup}":`, msg);
        return fail(rollup, count, sameDifficulty, `Database insert failed: ${msg}`);
    }
}
