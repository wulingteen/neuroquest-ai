/**
 * Core quiz question generation pipeline.
 *
 * Flow:
 *  1. Validate the target planet rollup exists.
 *  2. Fetch all existing quiz_questions for that planet (sorted by question_id).
 *  3. Call the LLM with existing questions + planet context.
 *  4. Parse & validate the response.
 *  5. Compute new level_number(s) for the batch.
 *  5b. **Ensure levels exist**: check that each target level_number exists in
 *      the `levels` table. If missing, call LLM to generate a meaningful title
 *      and insert the level with `xp_reward = LEVEL_BASE_XP + (n-1) × LEVEL_XP_STEP`.
 *  6. Compute `xp_reward` per question based on difficulty rank.
 *  7. Insert questions into the database inside a transaction.
 */
import db from "@/lib/db";
import { openai, QUIZ_GENERATOR_MODEL } from "./constants";
import {
    buildQuizGeneratorPrompt,
    buildLevelTitlePrompt,
    buildPlanetDescriptionPrompt,
    type ExistingQuestion,
    type ExistingLevel,
    type PlanetInfo,
} from "./prompts";
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
    /** Number of questions per level to generate (1–20). */
    count: number;
    /**
     * When true, all generated questions will be at the same advanced
     * difficulty level instead of ranging from easy to hard.
     * Default: false (ascending difficulty).
     */
    sameDifficulty?: boolean;
    /**
     * Number of distinct difficulty levels to generate (1–10).
     * Each level will contain `count` questions.
     * Total questions = count × levelCount.
     * When > 1, overrides sameDifficulty behaviour.
     * Default: undefined (single level, legacy behaviour).
     */
    levelCount?: number;
    /**
     * Topic overview provided by the user when the rollup doesn't exist
     * in the `planets` table. Used to create the planet on the fly.
     */
    overview?: string;
}

export interface GenerationResult {
    success: boolean;
    planet: string;
    questionsRequested: number;
    questionsInserted: number;
    skippedDuplicates: number;
    /** First (or only) level_number created. */
    levelNumber: number;
    /** All level_numbers created (populated in multi-level mode). */
    levelNumbers?: number[];
    /** How many difficulty levels were requested (1 for legacy mode). */
    levelCount: number;
    sameDifficulty: boolean;
    questions: Array<{
        question_id: number;
        level_number: number;
        question_number: number;
        question_text: string;
        xp_reward: number;
    }>;
    error?: string;
    /** When true, the client should prompt the user for an overview and retry. */
    needsOverview?: boolean;
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

// ─── Level XP Reward Formula ────────────────────────────────────────────────

/** Base XP reward for level 1. */
const LEVEL_BASE_XP = 150;
/** Additional XP per level increment. */
const LEVEL_XP_STEP = 50;

/**
 * Calculate `xp_reward` for a level row based on its position.
 * Formula: LEVEL_BASE_XP + (level_number - 1) × LEVEL_XP_STEP
 *
 * level_number 1 → 150, 2 → 200, 3 → 250, … 10 → 600, etc.
 */
export function calculateLevelXpReward(levelNumber: number): number {
    return LEVEL_BASE_XP + (levelNumber - 1) * LEVEL_XP_STEP;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fail(rollup: string, count: number, sameDifficulty: boolean, error: string, levelCount = 1): GenerationResult {
    return {
        success: false,
        planet: rollup,
        questionsRequested: count,
        questionsInserted: 0,
        skippedDuplicates: 0,
        levelNumber: 0,
        levelCount,
        sameDifficulty,
        questions: [],
        error,
    };
}

// ─── Ensure Levels Exist ─────────────────────────────────────────────────────

/**
 * Pre-check that the target level_number(s) exist in the `levels` table for
 * the given rollup. If any are missing, call the LLM to generate meaningful
 * titles and insert them.
 *
 * Returns a Map<level_number, title> with all (existing + newly created) titles.
 */
async function ensureLevelsExist(
    rollup: string,
    planetInfo: PlanetInfo,
    levelNumbers: number[],
): Promise<Map<number, string>> {
    const titleMap = new Map<number, string>();

    // Fetch existing levels for this rollup
    const existingLevels = await db.levels.findMany({
        where: { rollup },
        orderBy: { level_number: "asc" },
    });

    const existingLevelSet = new Set(existingLevels.map((l) => l.level_number));
    for (const l of existingLevels) {
        titleMap.set(l.level_number, l.title);
    }

    // Determine which level_numbers are missing
    const missingLevelNumbers = levelNumbers.filter((n) => !existingLevelSet.has(n));
    if (missingLevelNumbers.length === 0) {
        console.log(`[quiz-gen] ✅ All target levels [${levelNumbers.join(", ")}] already exist for "${rollup}".`);
        return titleMap;
    }

    console.log(`[quiz-gen] ⚠️  Missing levels [${missingLevelNumbers.join(", ")}] for "${rollup}". Generating titles via LLM…`);

    // Build context from existing levels
    const existingLevelContext: ExistingLevel[] = existingLevels.map((l) => ({
        level_number: l.level_number,
        title: l.title,
        content_type: l.content_type,
        xp_reward: l.xp_reward,
    }));

    // Call LLM to generate titles
    const titlePrompt = buildLevelTitlePrompt(planetInfo, existingLevelContext, missingLevelNumbers);
    let titleResponse: string;
    try {
        const completion = await retryAsync(
            () =>
                openai.chat.completions.create({
                    model: QUIZ_GENERATOR_MODEL,
                    messages: [{ role: "user", content: titlePrompt }],
                }),
            2,
            2000,
        );
        titleResponse = completion.choices?.[0]?.message?.content || "[]";
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown LLM error";
        console.warn(`[quiz-gen] LLM title generation failed for "${rollup}": ${msg}. Using fallback titles.`);
        // Fallback to generic titles
        titleResponse = JSON.stringify(
            missingLevelNumbers.map((n) => ({
                level_number: n,
                title: `${planetInfo.label} — Level ${n}`,
            })),
        );
    }

    // Parse title response
    let titleParsed: Array<{ level_number: number; title: string }>;
    try {
        titleParsed = parseLLMJson(titleResponse);
        if (!Array.isArray(titleParsed)) {
            throw new Error("Response is not an array");
        }
    } catch {
        console.warn(`[quiz-gen] Failed to parse LLM title response. Using fallback titles.`);
        titleParsed = missingLevelNumbers.map((n) => ({
            level_number: n,
            title: `${planetInfo.label} — Level ${n}`,
        }));
    }

    // Build a lookup from LLM response
    const llmTitles = new Map<number, string>();
    for (const item of titleParsed) {
        if (
            typeof item.level_number === "number" &&
            typeof item.title === "string" &&
            item.title.trim().length > 0
        ) {
            llmTitles.set(item.level_number, item.title.trim());
        }
    }

    // Compute next available level_id
    const maxLevelGlobal = await db.levels.findFirst({
        orderBy: { level_id: "desc" },
    });
    let nextLevelId = (maxLevelGlobal?.level_id ?? 0) + 1;

    // Insert missing levels
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertOps: any[] = [];
    for (const levelNumber of missingLevelNumbers) {
        const title = llmTitles.get(levelNumber) || `${planetInfo.label} — Level ${levelNumber}`;
        const xpReward = calculateLevelXpReward(levelNumber);

        insertOps.push(
            db.levels.create({
                data: {
                    level_id: nextLevelId++,
                    rollup,
                    level_number: levelNumber,
                    title,
                    content_type: "quiz",
                    xp_reward: xpReward,
                },
            }),
        );
        titleMap.set(levelNumber, title);
        console.log(`[quiz-gen]   → Level ${levelNumber}: "${title}" (xp_reward=${xpReward})`);
    }

    if (insertOps.length > 0) {
        await db.$transaction(insertOps);
        console.log(`[quiz-gen] ✅ Inserted ${insertOps.length} new level(s) for "${rollup}".`);
    }

    return titleMap;
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export async function generateQuizQuestions(
    options: GenerationOptions,
): Promise<GenerationResult> {
    const { rollup, count, sameDifficulty = false, levelCount, overview } = options;
    const effectiveLevelCount = (typeof levelCount === "number" && levelCount > 1) ? levelCount : 1;
    const isMultiLevel = effectiveLevelCount > 1;

    // ────────────────────────────────────────────────────────────────────
    // 1. Validate rollup — auto-create planet if overview is provided
    // ────────────────────────────────────────────────────────────────────
    let planet = await db.planets.findUnique({ where: { rollup } });
    if (!planet) {
        // If no overview provided, signal the caller to collect one
        if (!overview || overview.trim().length === 0) {
            const result = fail(
                rollup, count, sameDifficulty,
                `Planet with rollup "${rollup}" not found. Please provide a topic overview.`,
                effectiveLevelCount,
            );
            result.needsOverview = true;
            return result;
        }

        // Auto-create the planet from the overview via LLM
        console.log(`[quiz-gen] 🌍 Planet "${rollup}" not found. Generating metadata via LLM…`);

        // Fetch all existing planets for context (required_rollup selection)
        const existingPlanets = await db.planets.findMany({
            select: { rollup: true, description: true },
            orderBy: { planet_id: "asc" },
        });
        const existingRollupSet = new Set(existingPlanets.map((p) => p.rollup));

        // Call LLM to generate structured planet metadata
        let planetMeta: {
            label: string;
            subtitle: string;
            description: string;
            icon: string;
            required_rollup: string | null;
        } = {
            label: (rollup.length <= 4 ? rollup.toUpperCase() : rollup.charAt(0).toUpperCase() + rollup.slice(1)) + " Planet",
            subtitle: overview.trim().substring(0, 200),
            description: overview.trim(),
            icon: "🪐",
            required_rollup: null,
        };

        try {
            const descPrompt = buildPlanetDescriptionPrompt(
                rollup,
                overview.trim(),
                existingPlanets.map((p) => ({ rollup: p.rollup, description: p.description })),
            );
            const descCompletion = await retryAsync(
                () =>
                    openai.chat.completions.create({
                        model: QUIZ_GENERATOR_MODEL,
                        messages: [{ role: "user", content: descPrompt }],
                    }),
                2,
                2000,
            );
            const descResponse = descCompletion.choices?.[0]?.message?.content || "{}";
            const parsed = parseLLMJson(descResponse) as Record<string, unknown>;

            if (
                typeof parsed === "object" && parsed !== null &&
                typeof parsed.label === "string" && parsed.label.trim().length > 0 &&
                typeof parsed.subtitle === "string" && parsed.subtitle.trim().length > 0 &&
                typeof parsed.description === "string" && parsed.description.trim().length > 0
            ) {
                // Validate required_rollup: must be null or a known rollup
                let requiredRollup: string | null = null;
                if (typeof parsed.required_rollup === "string" && parsed.required_rollup.trim().length > 0) {
                    const candidate = parsed.required_rollup.trim();
                    if (existingRollupSet.has(candidate)) {
                        requiredRollup = candidate;
                    } else {
                        console.warn(`[quiz-gen] ⚠️  LLM suggested required_rollup "${candidate}" which doesn't exist. Ignoring.`);
                    }
                }

                planetMeta = {
                    label: parsed.label.trim(),
                    subtitle: parsed.subtitle.trim().substring(0, 200),
                    description: parsed.description.trim(),
                    icon: typeof parsed.icon === "string" && parsed.icon.trim().length > 0
                        ? parsed.icon.trim()
                        : "🪐",
                    required_rollup: requiredRollup,
                };
                console.log(`[quiz-gen]   → LLM generated: "${planetMeta.label}" | "${planetMeta.subtitle}"`);
                console.log(`[quiz-gen]   → Description: "${planetMeta.description}"`);
                console.log(`[quiz-gen]   → Required rollup: ${planetMeta.required_rollup ?? "(none)"}`);
            } else {
                console.warn(`[quiz-gen] ⚠️  LLM returned invalid planet metadata. Using fallback.`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown LLM error";
            console.warn(`[quiz-gen] ⚠️  LLM planet metadata generation failed: ${msg}. Using fallback.`);
        }

        const maxPlanet = await db.planets.findFirst({
            orderBy: { planet_id: "desc" },
        });
        const nextPlanetId = (maxPlanet?.planet_id ?? 0) + 1;

        planet = await db.planets.create({
            data: {
                planet_id: nextPlanetId,
                rollup,
                label: planetMeta.label,
                subtitle: planetMeta.subtitle,
                icon: planetMeta.icon,
                color: "#8B5CF6",
                glow_color: "rgba(139,92,246,0.5)",
                bg_gradient: "from-purple-900 to-violet-950",
                x: 50,
                y: 50,
                description: planetMeta.description,
                required_rollup: planetMeta.required_rollup,
            },
        });
        console.log(`[quiz-gen] ✅ Created planet "${rollup}" (planet_id=${planet.planet_id}).`);
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
    const prompt = buildQuizGeneratorPrompt(
        planetInfo, existingQuestions, count, sameDifficulty,
        isMultiLevel ? effectiveLevelCount : undefined,
    );

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
        return fail(rollup, count, sameDifficulty, `LLM call failed: ${msg}`, effectiveLevelCount);
    }

    // ────────────────────────────────────────────────────────────────────
    // 4. Parse & validate
    // ────────────────────────────────────────────────────────────────────
    let parsed: unknown;
    try {
        parsed = parseLLMJson(llmResponse);
    } catch (parseErr) {
        console.error(`[quiz-gen] JSON parse error for "${rollup}":`, parseErr);
        return fail(rollup, count, sameDifficulty, "Failed to parse LLM JSON response.", effectiveLevelCount);
    }

    // ── Multi-level parsing ─────────────────────────────────────────────
    // In multi-level mode the LLM returns { levels: [ { level, questions } ] }
    // We flatten it into per-level buckets for DB insertion.
    interface LevelBucket {
        tierIndex: number; // 0-based index of the tier
        questions: GeneratedQuestion[];
    }

    let levelBuckets: LevelBucket[];
    let skippedDuplicates = 0;

    if (isMultiLevel) {
        // Accept both a wrapper object and a raw array (fallback)
        const wrapper = parsed as Record<string, unknown>;
        const levelsArr = Array.isArray(wrapper?.levels) ? wrapper.levels : null;

        if (!levelsArr || levelsArr.length === 0) {
            return fail(rollup, count, sameDifficulty, "Multi-level LLM response missing 'levels' array.", effectiveLevelCount);
        }

        levelBuckets = [];
        for (let tierIdx = 0; tierIdx < levelsArr.length; tierIdx++) {
            const tier = levelsArr[tierIdx] as Record<string, unknown>;
            const rawQuestions = Array.isArray(tier?.questions) ? tier.questions : [];
            const valid: GeneratedQuestion[] = [];
            for (const raw of rawQuestions) {
                if (!isValidGeneratedQuestion(raw)) {
                    console.warn(`[quiz-gen] Skipping invalid question in tier ${tierIdx + 1} for "${rollup}".`);
                    continue;
                }
                if (isDuplicate(raw.question_text, existingQuestions)) {
                    console.warn(`[quiz-gen] Skipping duplicate in tier ${tierIdx + 1} for "${rollup}": "${raw.question_text.substring(0, 60)}…"`);
                    skippedDuplicates++;
                    continue;
                }
                valid.push(raw);
            }
            levelBuckets.push({ tierIndex: tierIdx, questions: valid });
        }
    } else {
        // Legacy single-level mode
        if (!Array.isArray(parsed)) {
            return fail(rollup, count, sameDifficulty, "LLM response was not an array.", effectiveLevelCount);
        }
        const valid: GeneratedQuestion[] = [];
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
            valid.push(raw);
        }
        levelBuckets = [{ tierIndex: 0, questions: valid }];
    }

    // Check we have at least some valid questions
    const totalValid = levelBuckets.reduce((sum, b) => sum + b.questions.length, 0);
    if (totalValid === 0) {
        return fail(rollup, count, sameDifficulty, "No valid, non-duplicate questions in LLM response.", effectiveLevelCount);
    }

    // ────────────────────────────────────────────────────────────────────
    // 5. Compute new level_number(s)
    //    Each bucket gets its own consecutive level_number.
    // ────────────────────────────────────────────────────────────────────
    const maxLevelForPlanet = await db.levels.findFirst({
        where: { rollup },
        orderBy: { level_number: "desc" },
        select: { level_number: true },
    });
    const baseLevelNumber = (maxLevelForPlanet?.level_number ?? 0) + 1;

    // Compute the level_numbers we'll need
    const targetLevelNumbers: number[] = [];
    for (let bIdx = 0; bIdx < levelBuckets.length; bIdx++) {
        if (levelBuckets[bIdx].questions.length > 0) {
            targetLevelNumbers.push(baseLevelNumber + bIdx);
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // 5b. Ensure all target levels exist in the `levels` table.
    //     If any are missing, call LLM to generate titles & insert them.
    // ────────────────────────────────────────────────────────────────────
    await ensureLevelsExist(rollup, planetInfo, targetLevelNumbers);

    // ────────────────────────────────────────────────────────────────────
    // 6 & 7. Compute XP and insert questions in a transaction
    //        (Levels are already guaranteed to exist at this point.)
    // ────────────────────────────────────────────────────────────────────

    // Build transaction operations across all level buckets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txOps: any[] = [];
    const newLevelNumbers: number[] = [];
    let questionDataCount = 0;

    for (let bIdx = 0; bIdx < levelBuckets.length; bIdx++) {
        const bucket = levelBuckets[bIdx];
        if (bucket.questions.length === 0) continue;

        const levelNumber = baseLevelNumber + bIdx;
        newLevelNumbers.push(levelNumber);

        const batchSize = bucket.questions.length;
        // In multi-level mode, boost XP by tier index so higher tiers reward more
        const tierBonus = isMultiLevel ? bIdx * STEP_XP * 2 : 0;

        for (let qi = 0; qi < bucket.questions.length; qi++) {
            const q = bucket.questions[qi];
            const baseXp = calculateXpReward(
                qi, existingQuestions.length,
                isMultiLevel ? true : sameDifficulty,
                batchSize,
            );
            txOps.push(
                db.quiz_questions.create({
                    data: {
                        rollup,
                        level_number: levelNumber,
                        question_number: qi + 1,
                        question_text: q.question_text.trim(),
                        options: q.options.map((o) => o.trim()),
                        correct_option_index: q.correct_option_index,
                        explanation: q.explanation.trim(),
                        xp_reward: baseXp + tierBonus,
                    },
                }),
            );
            questionDataCount++;
        }
    }

    try {
        const results = await db.$transaction(txOps);

        // All transaction ops are question creates now (levels are pre-ensured).
        const insertedQuestions: GenerationResult["questions"] = [];
        for (const r of results) {
            const rec = r as Record<string, unknown>;
            insertedQuestions.push({
                question_id: rec.question_id as number,
                level_number: rec.level_number as number,
                question_number: rec.question_number as number,
                question_text: rec.question_text as string,
                xp_reward: rec.xp_reward as number,
            });
        }

        const levelNumsStr = newLevelNumbers.join(", ");
        console.log(
            `[quiz-gen] ✅ ${insertedQuestions.length}/${questionDataCount} questions inserted for "${rollup}" ` +
            `at level_number(s) ${levelNumsStr} (${skippedDuplicates} duplicates skipped, ` +
            `sameDifficulty=${sameDifficulty}, levelCount=${effectiveLevelCount}).`,
        );

        return {
            success: true,
            planet: rollup,
            questionsRequested: count * effectiveLevelCount,
            questionsInserted: insertedQuestions.length,
            skippedDuplicates,
            levelNumber: newLevelNumbers[0] ?? baseLevelNumber,
            levelNumbers: newLevelNumbers,
            levelCount: effectiveLevelCount,
            sameDifficulty,
            questions: insertedQuestions,
        };
    } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : String(txErr);
        console.error(`[quiz-gen] Transaction failed for "${rollup}":`, msg);
        return fail(rollup, count, sameDifficulty, `Database insert failed: ${msg}`, effectiveLevelCount);
    }
}
