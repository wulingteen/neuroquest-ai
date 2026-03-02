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
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_QUESTION_TEXT_LENGTH = 2000;
const MAX_FIELD_LENGTH = 1000;
const REQUIRED_OPTION_COUNT = 4;

/** XP formula for questions: BASE + (level_number - 1) × STEP */
const QUESTION_XP_BASE = 150;
const QUESTION_XP_STEP = 50;

/** XP formula for auto-created level rows: 150 + (level_number - 1) × 50 */
const LEVEL_XP_BASE = 150;
const LEVEL_XP_STEP = 50;

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuestionInput {
    rollup: string;
    level_number: number;
    title: string;
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string;
    xp_reward?: number;
}

interface ResolvedQuestion {
    rollup: string;
    level_number: number;
    question_number: number;
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string;
    xp_reward: number;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateInput(q: QuestionInput, index: number): string[] {
    const errors: string[] = [];
    const prefix = `[question ${index + 1}]`;

    if (!q.rollup || typeof q.rollup !== "string" || q.rollup.trim().length === 0) {
        errors.push(`${prefix} "rollup" is required and must be a non-empty string.`);
    }

    if (!q.question_text || typeof q.question_text !== "string" || q.question_text.trim().length === 0) {
        errors.push(`${prefix} "question_text" is required and must be a non-empty string.`);
    } else if (q.question_text.length > MAX_QUESTION_TEXT_LENGTH) {
        errors.push(`${prefix} "question_text" exceeds ${MAX_QUESTION_TEXT_LENGTH} characters.`);
    }

    if (!Array.isArray(q.options)) {
        errors.push(`${prefix} "options" must be a JSON array.`);
    } else if (q.options.length !== REQUIRED_OPTION_COUNT) {
        errors.push(`${prefix} "options" must have exactly ${REQUIRED_OPTION_COUNT} items (got ${q.options.length}).`);
    } else {
        for (let i = 0; i < q.options.length; i++) {
            if (typeof q.options[i] !== "string" || q.options[i].length === 0) {
                errors.push(`${prefix} options[${i}] must be a non-empty string.`);
            } else if (q.options[i].length > MAX_FIELD_LENGTH) {
                errors.push(`${prefix} options[${i}] exceeds ${MAX_FIELD_LENGTH} characters.`);
            }
        }
    }

    if (typeof q.correct_option_index !== "number" || !Number.isInteger(q.correct_option_index)) {
        errors.push(`${prefix} "correct_option_index" must be an integer.`);
    } else if (q.correct_option_index < 0 || q.correct_option_index > 3) {
        errors.push(`${prefix} "correct_option_index" must be between 0 and 3 (got ${q.correct_option_index}).`);
    }

    if (typeof q.explanation !== "string") {
        errors.push(`${prefix} "explanation" must be a string.`);
    } else if (q.explanation.length > MAX_FIELD_LENGTH) {
        errors.push(`${prefix} "explanation" exceeds ${MAX_FIELD_LENGTH} characters.`);
    }

    if (q.level_number === undefined || q.level_number === null) {
        errors.push(`${prefix} "level_number" is required.`);
    } else if (typeof q.level_number !== "number" || !Number.isInteger(q.level_number) || q.level_number < 1) {
        errors.push(`${prefix} "level_number" must be a positive integer.`);
    }

    if (!q.title || typeof q.title !== "string" || q.title.trim().length === 0) {
        errors.push(`${prefix} "title" is required and must be a non-empty string.`);
    } else if (q.title.length > MAX_FIELD_LENGTH) {
        errors.push(`${prefix} "title" exceeds ${MAX_FIELD_LENGTH} characters.`);
    }

    if (q.xp_reward !== undefined) {
        if (typeof q.xp_reward !== "number" || !Number.isInteger(q.xp_reward) || q.xp_reward < 0) {
            errors.push(`${prefix} "xp_reward" must be a non-negative integer.`);
        }
    }

    return errors;
}

// ─── XP Calculation ──────────────────────────────────────────────────────────

function calculateQuestionXp(levelNumber: number): number {
    return QUESTION_XP_BASE + (levelNumber - 1) * QUESTION_XP_STEP;
}

function calculateLevelXp(levelNumber: number): number {
    return LEVEL_XP_BASE + (levelNumber - 1) * LEVEL_XP_STEP;
}

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

interface CliArgs {
    file?: string;
    rollup?: string;
    level?: number;
    title?: string;
    question?: string;
    options?: string[];
    correct?: number;
    explanation?: string;
    xp?: number;
    upsert: boolean;
    dryRun: boolean;
    yes: boolean;
}

function parseCliArgs(): CliArgs {
    const args = process.argv.slice(2);
    const result: CliArgs = { upsert: false, dryRun: false, yes: false };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const next = () => {
            if (i + 1 >= args.length) {
                console.error(`❌ Missing value for ${arg}`);
                process.exit(1);
            }
            return args[++i];
        };

        switch (arg) {
            case "--file":
            case "-f":
                result.file = next();
                break;
            case "--rollup":
            case "-r":
                result.rollup = next();
                break;
            case "--question":
            case "-q":
                result.question = next();
                break;
            case "--options":
            case "-o":
                try {
                    result.options = JSON.parse(next());
                } catch {
                    console.error('❌ --options must be a valid JSON array, e.g. \'["A","B","C","D"]\'');
                    process.exit(1);
                }
                break;
            case "--correct":
            case "-c":
                result.correct = parseInt(next(), 10);
                break;
            case "--explanation":
            case "-e":
                result.explanation = next();
                break;
            case "--level":
            case "-l":
                result.level = parseInt(next(), 10);
                break;
            case "--title":
            case "-t":
                result.title = next();
                break;
            case "--xp":
                result.xp = parseInt(next(), 10);
                break;
            case "--upsert":
                result.upsert = true;
                break;
            case "--dry-run":
                result.dryRun = true;
                break;
            case "--yes":
            case "-y":
                result.yes = true;
                break;
            case "--help":
            case "-h":
                printUsage();
                process.exit(0);
            default:
                console.error(`❌ Unknown argument: ${arg}`);
                printUsage();
                process.exit(1);
        }
    }

    return result;
}

function printUsage(): void {
    console.log(`
insert-question — Insert quiz questions into the database.

SINGLE QUESTION:
  npx tsx .agent/skills/generate-quiz/scripts/insert-question.ts \\
    --rollup <rollup> \\
    --level <N> \\
    --title <level title> \\
    --question <text> \\
    --options '<JSON array>' \\
    --correct <0-3> \\
    --explanation <text> \\
    [--xp <N>] [--upsert] [--dry-run] [--yes]

BATCH MODE:
  npx tsx .agent/skills/generate-quiz/scripts/insert-question.ts \\
    --file <path.json> [--upsert] [--dry-run] [--yes]

FLAGS:
  -r, --rollup       Planet rollup name (e.g. "prompt")
  -l, --level        Target level_number (required)
  -t, --title        Level title (required, used when creating level row)
  -q, --question     Question text
  -o, --options      JSON array of 4 options
  -c, --correct      Correct option index (0–3)
  -e, --explanation  Explanation for the correct answer
      --xp           Override auto-computed xp_reward
  -f, --file         Path to a JSON file for batch insert
      --upsert       Update existing on unique constraint conflict
      --dry-run      Validate and preview without writing to DB
  -y, --yes          Skip interactive confirmation
  -h, --help         Show this help message
`);
}

// ─── Interactive Confirmation ────────────────────────────────────────────────

async function confirm(message: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(`${message} [y/N] `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
        });
    });
}

// ─── Level Management ────────────────────────────────────────────────────────

/**
 * Pre-flight guard: check that NONE of the target (rollup, level_number)
 * pairs already exist in the `levels` table. If any do, abort the entire
 * operation so the user can fix the input.
 *
 * Returns the set of validated `rollup:level_number` keys.
 */
async function guardNoExistingLevels(
    prisma: PrismaClient,
    inputs: QuestionInput[],
): Promise<void> {
    // Collect unique (rollup, level_number) pairs
    const pairs = new Map<string, { rollup: string; level_number: number }>();
    for (const q of inputs) {
        const key = `${q.rollup.trim()}:${q.level_number}`;
        if (!pairs.has(key)) {
            pairs.set(key, { rollup: q.rollup.trim(), level_number: q.level_number });
        }
    }

    // Query each pair against the DB
    const conflicts: Array<{ rollup: string; level_number: number; title: string }> = [];
    for (const { rollup, level_number } of pairs.values()) {
        const existing = await prisma.levels.findUnique({
            where: { rollup_level_number: { rollup, level_number } },
            select: { level_number: true, title: true },
        });
        if (existing) {
            conflicts.push({ rollup, level_number, title: existing.title });
        }
    }

    if (conflicts.length > 0) {
        console.error("\n❌ Aborted — the following level(s) already exist in the database:\n");
        for (const c of conflicts) {
            console.error(`  • rollup="${c.rollup}"  level_number=${c.level_number}  title="${c.title}"`);
        }
        console.error("\n  The entire file was NOT written. Please use a different level_number");
        console.error("  or remove existing levels before retrying.\n");
        process.exit(1);
    }
}

/**
 * Create a new level row. Called only after guardNoExistingLevels has
 * confirmed the level does not exist.
 */
async function createLevel(
    prisma: PrismaClient,
    rollup: string,
    levelNumber: number,
    title: string,
): Promise<void> {
    // Compute next available level_id
    const maxLevel = await prisma.levels.findFirst({
        orderBy: { level_id: "desc" },
    });
    const nextLevelId = (maxLevel?.level_id ?? 0) + 1;
    const xpReward = calculateLevelXp(levelNumber);

    await prisma.levels.create({
        data: {
            level_id: nextLevelId,
            rollup,
            level_number: levelNumber,
            title,
            content_type: "quiz",
            xp_reward: xpReward,
        },
    });

    console.log(`  📦 Created level ${levelNumber}: "${title}" for "${rollup}" (level_id=${nextLevelId}, xp=${xpReward})`);
}



// ─── Next Question Number ────────────────────────────────────────────────────

async function getNextQuestionNumber(
    prisma: PrismaClient,
    rollup: string,
    levelNumber: number,
): Promise<number> {
    const maxQ = await prisma.quiz_questions.findFirst({
        where: { rollup, level_number: levelNumber },
        orderBy: { question_number: "desc" },
        select: { question_number: true },
    });

    return (maxQ?.question_number ?? 0) + 1;
}

// ─── Duplicate Detection ─────────────────────────────────────────────────────

async function isDuplicate(
    prisma: PrismaClient,
    rollup: string,
    questionText: string,
): Promise<boolean> {
    const normalised = questionText.toLowerCase().replace(/\s+/g, " ").trim();

    const existingQuestions = await prisma.quiz_questions.findMany({
        where: { rollup },
        select: { question_text: true },
    });

    return existingQuestions.some((q) => {
        const existNorm = q.question_text.toLowerCase().replace(/\s+/g, " ").trim();
        return existNorm === normalised;
    });
}

// ─── Planet Validation ───────────────────────────────────────────────────────

async function ensurePlanetExists(
    prisma: PrismaClient,
    rollup: string,
): Promise<void> {
    const planet = await prisma.planets.findUnique({ where: { rollup } });
    if (!planet) {
        console.error(`❌ Planet with rollup "${rollup}" does not exist.`);
        console.error(`   Available planets:`);
        const planets = await prisma.planets.findMany({
            select: { rollup: true, label: true },
            orderBy: { planet_id: "asc" },
        });
        for (const p of planets) {
            console.error(`     • ${p.rollup} (${p.label})`);
        }
        process.exit(1);
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const cli = parseCliArgs();

    // ── Build input list ─────────────────────────────────────────────────
    let inputs: QuestionInput[];

    if (cli.file) {
        // Batch mode: read from JSON file
        let raw: string;
        try {
            raw = readFileSync(cli.file, "utf-8");
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`❌ Cannot read file "${cli.file}": ${msg}`);
            process.exit(1);
        }

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                console.error('❌ JSON file must contain an array of question objects.');
                process.exit(1);
            }
            inputs = parsed;
        } catch {
            console.error('❌ Invalid JSON in file.');
            process.exit(1);
        }
    } else {
        // Single question mode — validate required CLI args
        if (!cli.rollup || cli.level === undefined || !cli.title || !cli.question || !cli.options || cli.correct === undefined || !cli.explanation) {
            console.error("❌ Missing required arguments. Use --help for usage.\n");
            console.error("Required: --rollup, --level, --title, --question, --options, --correct, --explanation");
            process.exit(1);
        }

        inputs = [
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

    if (inputs.length === 0) {
        console.error("❌ No questions to insert.");
        process.exit(1);
    }

    // ── Validate all inputs ──────────────────────────────────────────────
    const allErrors: string[] = [];
    for (let i = 0; i < inputs.length; i++) {
        allErrors.push(...validateInput(inputs[i], i));
    }
    if (allErrors.length > 0) {
        console.error("❌ Validation errors:\n");
        for (const e of allErrors) console.error(`  ${e}`);
        process.exit(1);
    }

    console.log(`\n🧩 Preparing ${inputs.length} question(s) for insertion…\n`);

    // ── Resolve all fields ───────────────────────────────────────────────
    const prisma = new PrismaClient();

    try {
        // Validate all referenced planets exist
        const uniqueRollups = [...new Set(inputs.map((q) => q.rollup))];
        for (const rollup of uniqueRollups) {
            await ensurePlanetExists(prisma, rollup);
        }

        // ── Pre-flight: block if any target level already exists ──────
        await guardNoExistingLevels(prisma, inputs);

        // Resolve questions: compute question_number, xp_reward
        const resolved: ResolvedQuestion[] = [];
        // Track question_number allocation per (rollup, level_number) since
        // multiple questions in the same batch may target the same level.
        const qnumTracker = new Map<string, number>();

        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const rollup = input.rollup.trim();

            // Check for duplicates
            const dup = await isDuplicate(prisma, rollup, input.question_text);
            if (dup && !cli.upsert) {
                console.warn(`  ⚠️  [question ${i + 1}] Duplicate detected — skipping: "${input.question_text.substring(0, 60)}…"`);
                continue;
            }

            // level_number is required and validated, use directly
            const levelNumber = input.level_number;

            // Compute question_number (accounts for batch siblings)
            // Levels are guaranteed new (guard checked), so start from 1
            const trackKey = `${rollup}:${levelNumber}`;
            let questionNumber: number;
            if (qnumTracker.has(trackKey)) {
                questionNumber = qnumTracker.get(trackKey)! + 1;
            } else {
                questionNumber = 1;
            }
            qnumTracker.set(trackKey, questionNumber);

            // Compute xp_reward
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

        if (resolved.length === 0) {
            console.log("\n⚠️  No new questions to insert (all duplicates or empty).");
            return;
        }

        // ── Preview ──────────────────────────────────────────────────────
        console.log("┌─────────────────────────────────────────────────────────────┐");
        console.log("│                     Question Preview                        │");
        console.log("└─────────────────────────────────────────────────────────────┘\n");

        for (const q of resolved) {
            console.log(`  📌 rollup: ${q.rollup} | level: ${q.level_number} | q#: ${q.question_number} | xp: ${q.xp_reward}`);
            console.log(`     Q: ${q.question_text}`);
            for (let oi = 0; oi < q.options.length; oi++) {
                const marker = oi === q.correct_option_index ? "✅" : "  ";
                console.log(`     ${marker} [${oi}] ${q.options[oi]}`);
            }
            console.log(`     💡 ${q.explanation}`);
            console.log();
        }

        if (cli.dryRun) {
            console.log("🏁 Dry run complete — no data written.\n");
            return;
        }

        // ── Confirm ──────────────────────────────────────────────────────
        if (!cli.yes) {
            const proceed = await confirm(`Insert ${resolved.length} question(s) into the database?`);
            if (!proceed) {
                console.log("❌ Cancelled.");
                return;
            }
        }

        // ── Create all new levels ────────────────────────────────────────
        const createdLevels = new Set<string>();
        for (const input of inputs) {
            const key = `${input.rollup.trim()}:${input.level_number}`;
            if (!createdLevels.has(key)) {
                await createLevel(prisma, input.rollup.trim(), input.level_number, input.title.trim());
                createdLevels.add(key);
            }
        }

        // ── Insert ───────────────────────────────────────────────────────
        if (cli.upsert) {
            // Upsert mode: use raw SQL for ON CONFLICT
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
            // Standard insert via Prisma transaction
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

            // Print summary
            for (const r of results) {
                console.log(`  [ID=${r.question_id}] L${r.level_number} Q${r.question_number} — ${r.question_text.substring(0, 60)}…`);
            }
            console.log();
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error("❌ Fatal error:", err.message ?? err);
    process.exit(1);
});
