#!/usr/bin/env npx tsx
/**
 * insert-question.ts — Insert quiz question(s) into the database.
 *
 * The operator provides the core content fields + level_number + title;
 * bookkeeping fields (question_number, xp_reward, level row creation)
 * are computed automatically.
 *
 * ── Single Question ──────────────────────────────────────────────────────
 *
 *   npx tsx .agent/skills/generate-quiz/scripts/insert-question.ts \
 *     --rollup prompt \
 *     --level 2 \
 *     --title "Zero-shot vs Few-shot" \
 *     --question "Which technique asks an LLM to reason step by step?" \
 *     --options '["Zero-shot","Chain of Thought","Few-shot","Role-play"]' \
 *     --correct 1 \
 *     --explanation "CoT prompting elicits step-by-step reasoning."
 *
 *   Optional flags:
 *     --xp <N>            Override auto-computed xp_reward
 *     --upsert            Update on (rollup, level_number, question_number) conflict
 *     --dry-run           Validate and print without writing
 *     --yes               Skip interactive confirmation
 *
 * ── Batch Mode (JSON file) ───────────────────────────────────────────────
 *
 *   npx tsx .agent/skills/generate-quiz/scripts/insert-question.ts \
 *     --file questions.json [--dry-run] [--upsert] [--yes]
 *
 *   JSON format:
 *   [
 *     {
 *       "rollup": "prompt",
 *       "level_number": 3,
 *       "title": "Role-play Prompting",
 *       "question_text": "...",
 *       "options": ["A","B","C","D"],
 *       "correct_option_index": 1,
 *       "explanation": "...",
 *       "xp_reward": 200         // optional
 *     }
 *   ]
 */

import { PrismaClient } from "@prisma/client";
import {
    parseCliArgs,
    printUsage,
    validateBatch,
    detectTitleConflicts,
    calculateQuestionXp,
    ensurePlanetExists,
    checkExistingLevels,
    getNextQuestionNumber,
    createLevel,
    isDuplicate,
    readBatchFile,
    confirm,
    printPreview,
    printExistingLevels,
    printTitleConflicts,
    printMultiRollupNotice,
} from "./src/index.js";
import type { QuestionInput, ResolvedQuestion } from "./src/index.js";

// ─── Input Building ──────────────────────────────────────────────────────────

function buildInputsFromCli(cli: ReturnType<typeof parseCliArgs>): QuestionInput[] {
    if (cli.file) {
        return readBatchFile(cli.file);
    }

    if (!cli.rollup || cli.level === undefined || !cli.title || !cli.question || !cli.options || cli.correct === undefined || !cli.explanation) {
        console.error("❌ Missing required arguments. Use --help for usage.\n");
        console.error("Required: --rollup, --level, --title, --question, --options, --correct, --explanation");
        process.exit(1);
    }

    return [
        {
            rollup: cli.rollup,
            level_number: cli.level,
            title: cli.title,
            question_text: cli.question,
            options: cli.options,
            correct_option_index: cli.correct,
            explanation: cli.explanation,
            xp_reward: cli.xp,
        },
    ];
}

// ─── Unique Pairs Helper ─────────────────────────────────────────────────────

function extractUniquePairs(inputs: QuestionInput[]): Array<{ rollup: string; level_number: number }> {
    const seen = new Map<string, { rollup: string; level_number: number }>();
    for (const q of inputs) {
        const key = `${q.rollup.trim()}:${q.level_number}`;
        if (!seen.has(key)) {
            seen.set(key, { rollup: q.rollup.trim(), level_number: q.level_number });
        }
    }
    return [...seen.values()];
}

// ─── Question Resolution ─────────────────────────────────────────────────────

/**
 * Resolves question inputs into fully-computed questions, handling both
 * new and existing levels for question_number assignment.
 *
 * @param existingLevelKeys — Set of `rollup:level_number` keys that already
 *        exist in the DB (used to determine whether to query next question_number
 *        or start from 1).
 */
async function resolveQuestions(
    prisma: PrismaClient,
    inputs: QuestionInput[],
    upsert: boolean,
    existingLevelKeys: Set<string>,
): Promise<ResolvedQuestion[]> {
    const resolved: ResolvedQuestion[] = [];
    const qnumTracker = new Map<string, number>();

    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const rollup = input.rollup.trim();

        // Check for duplicates
        const dup = await isDuplicate(prisma, rollup, input.question_text);
        if (dup && !upsert) {
            console.warn(`  ⚠️  [question ${i + 1}] Duplicate detected — skipping: "${input.question_text.substring(0, 60)}…"`);
            continue;
        }

        const levelNumber = input.level_number;
        const trackKey = `${rollup}:${levelNumber}`;

        // Compute question_number — for existing levels, query the DB first
        let questionNumber: number;
        if (qnumTracker.has(trackKey)) {
            // Already computed the base for this level (either from DB or start=1)
            questionNumber = qnumTracker.get(trackKey)! + 1;
        } else if (existingLevelKeys.has(trackKey)) {
            // Existing level — start from next available in DB
            questionNumber = await getNextQuestionNumber(prisma, rollup, levelNumber);
        } else {
            // Brand-new level — start from 1
            questionNumber = 1;
        }
        qnumTracker.set(trackKey, questionNumber);

        const xpReward = input.xp_reward ?? calculateQuestionXp(levelNumber);

        resolved.push({
            rollup,
            level_number: levelNumber,
            question_number: questionNumber,
            question_text: input.question_text.trim(),
            options: input.options.map((o) => o.trim()),
            correct_option_index: input.correct_option_index,
            explanation: input.explanation.trim(),
            xp_reward: xpReward,
        });
    }

    return resolved;
}

// ─── Database Write ──────────────────────────────────────────────────────────

/**
 * Writes resolved questions to the database.
 * Only creates level rows for levels that don't already exist.
 */
async function insertQuestions(
    prisma: PrismaClient,
    inputs: QuestionInput[],
    resolved: ResolvedQuestion[],
    upsert: boolean,
    existingLevelKeys: Set<string>,
): Promise<void> {
    // Create only NEW levels (skip existing ones)
    const createdLevels = new Set<string>();
    for (const input of inputs) {
        const key = `${input.rollup.trim()}:${input.level_number}`;
        if (!createdLevels.has(key) && !existingLevelKeys.has(key)) {
            await createLevel(prisma, input.rollup.trim(), input.level_number, input.title.trim());
            createdLevels.add(key);
        }
    }

    // Insert questions
    if (upsert) {
        let insertedCount = 0;
        for (const q of resolved) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO quiz_questions
                    (rollup, level_number, question_number, question_text, options, correct_option_index, explanation, xp_reward)
                 VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
                 ON CONFLICT (rollup, level_number, question_number) DO UPDATE SET
                    question_text = EXCLUDED.question_text,
                    options = EXCLUDED.options,
                    correct_option_index = EXCLUDED.correct_option_index,
                    explanation = EXCLUDED.explanation,
                    xp_reward = EXCLUDED.xp_reward,
                    updated_at = now()`,
                q.rollup,
                q.level_number,
                q.question_number,
                q.question_text,
                JSON.stringify(q.options),
                q.correct_option_index,
                q.explanation,
                q.xp_reward,
            );
            insertedCount++;
        }
        console.log(`\n✅ Upserted ${insertedCount} question(s) successfully.\n`);
    } else {
        const txOps = resolved.map((q) =>
            prisma.quiz_questions.create({
                data: {
                    rollup: q.rollup,
                    level_number: q.level_number,
                    question_number: q.question_number,
                    question_text: q.question_text,
                    options: q.options,
                    correct_option_index: q.correct_option_index,
                    explanation: q.explanation,
                    xp_reward: q.xp_reward,
                },
            }),
        );

        const results = await prisma.$transaction(txOps);
        console.log(`\n✅ Inserted ${results.length} question(s) successfully.\n`);

        for (const r of results) {
            console.log(`  [ID=${r.question_id}] L${r.level_number} Q${r.question_number} — ${r.question_text.substring(0, 60)}…`);
        }
        console.log();
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    let cli;
    try {
        cli = parseCliArgs();
    } catch (err) {
        console.error(`❌ ${err instanceof Error ? err.message : err}`);
        printUsage();
        process.exit(1);
    }

    // Build input list
    const inputs = buildInputsFromCli(cli);
    if (inputs.length === 0) {
        console.error("❌ No questions to insert.");
        process.exit(1);
    }

    // ── Phase 1: Field-level validation ──────────────────────────────────
    try {
        validateBatch(inputs);
    } catch (err) {
        console.error(`❌ ${err instanceof Error ? err.message : err}`);
        process.exit(1);
    }

    // ── Phase 2: Batch consistency checks ────────────────────────────────

    // Check for title conflicts (same level_number with different titles)
    const titleConflicts = detectTitleConflicts(inputs);
    if (titleConflicts.length > 0) {
        printTitleConflicts(titleConflicts);
        process.exit(1);
    }

    // Check for multiple rollups in a batch
    const uniqueRollups = [...new Set(inputs.map((q) => q.rollup.trim()))];
    if (uniqueRollups.length > 1) {
        printMultiRollupNotice(uniqueRollups);
        if (!cli.yes) {
            const proceed = await confirm("Continue with questions across multiple planets?");
            if (!proceed) {
                console.log("❌ Cancelled.");
                process.exit(0);
            }
        }
    }

    console.log(`\n🧩 Preparing ${inputs.length} question(s) for insertion…\n`);

    const prisma = new PrismaClient();

    try {
        // ── Phase 3: Database pre-flight checks ─────────────────────────

        // Validate all referenced planets exist
        for (const rollup of uniqueRollups) {
            await ensurePlanetExists(prisma, rollup);
        }

        // Check for existing levels
        const uniquePairs = extractUniquePairs(inputs);
        const existingLevels = await checkExistingLevels(prisma, uniquePairs);
        const existingLevelKeys = new Set(
            existingLevels.map((l) => `${l.rollup}:${l.level_number}`),
        );

        if (existingLevels.length > 0) {
            printExistingLevels(existingLevels);
            if (!cli.yes) {
                const proceed = await confirm(
                    `Append new questions to ${existingLevels.length} existing level(s)?`,
                );
                if (!proceed) {
                    console.log("❌ Cancelled — no data written.");
                    return;
                }
            } else {
                console.log("  ℹ️  --yes flag set: auto-appending to existing levels.\n");
            }
        }

        // ── Phase 4: Resolve questions ──────────────────────────────────
        const resolved = await resolveQuestions(prisma, inputs, cli.upsert, existingLevelKeys);

        if (resolved.length === 0) {
            console.log("\n⚠️  No new questions to insert (all duplicates or empty).");
            return;
        }

        // ── Phase 5: Preview ────────────────────────────────────────────
        printPreview(resolved);

        if (cli.dryRun) {
            console.log("🏁 Dry run complete — no data written.\n");
            return;
        }

        // ── Phase 6: Final confirmation & write ─────────────────────────
        if (!cli.yes) {
            const proceed = await confirm(`Insert ${resolved.length} question(s) into the database?`);
            if (!proceed) {
                console.log("❌ Cancelled.");
                return;
            }
        }

        await insertQuestions(prisma, inputs, resolved, cli.upsert, existingLevelKeys);
    } catch (err) {
        console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error("❌ Fatal error:", err.message ?? err);
    process.exit(1);
});
