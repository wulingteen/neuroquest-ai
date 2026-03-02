/**
 * Database operations for the insert-question pipeline.
 *
 * Each function receives a PrismaClient instance (dependency injection)
 * to keep the module stateless and testable.
 */

import type { PrismaClient } from "@prisma/client";
import { calculateLevelXp } from "./xp.js";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Rich information about a level that already exists in the database. */
export interface ExistingLevelInfo {
    rollup: string;
    level_number: number;
    title: string;
    question_count: number;
}

// ─── Planet Validation ───────────────────────────────────────────────────────

/**
 * Asserts that the given rollup exists in the `planets` table.
 * Throws with a helpful message listing available planets if not found.
 */
export async function ensurePlanetExists(
    prisma: PrismaClient,
    rollup: string,
): Promise<void> {
    const planet = await prisma.planets.findUnique({ where: { rollup } });
    if (!planet) {
        const planets = await prisma.planets.findMany({
            select: { rollup: true, label: true },
            orderBy: { planet_id: "asc" },
        });
        const available = planets.map((p) => `  • ${p.rollup} (${p.label})`).join("\n");
        throw new Error(
            `Planet with rollup "${rollup}" does not exist.\n` +
            `Available planets:\n${available}`,
        );
    }
}

// ─── Level Management ────────────────────────────────────────────────────────

/**
 * Check which of the target (rollup, level_number) pairs already exist
 * in the `levels` table. Returns rich info for each existing level
 * (title, question count) so the caller can display it to the user.
 *
 * Returns an empty array if none of the pairs exist.
 */
export async function checkExistingLevels(
    prisma: PrismaClient,
    pairs: Array<{ rollup: string; level_number: number }>,
): Promise<ExistingLevelInfo[]> {
    const existing: ExistingLevelInfo[] = [];

    for (const { rollup, level_number } of pairs) {
        const level = await prisma.levels.findUnique({
            where: { rollup_level_number: { rollup, level_number } },
            select: { level_number: true, title: true },
        });
        if (level) {
            const questionCount = await prisma.quiz_questions.count({
                where: { rollup, level_number },
            });
            existing.push({
                rollup,
                level_number,
                title: level.title,
                question_count: questionCount,
            });
        }
    }

    return existing;
}

/**
 * Create a new level row. Should only be called for levels confirmed
 * to not yet exist.
 */
export async function createLevel(
    prisma: PrismaClient,
    rollup: string,
    levelNumber: number,
    title: string,
): Promise<{ level_id: number; xp_reward: number }> {
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
    return { level_id: nextLevelId, xp_reward: xpReward };
}

// ─── Next Question Number ────────────────────────────────────────────────────

/**
 * Returns the next available question_number for the given
 * (rollup, level_number) pair by querying the max existing value.
 */
export async function getNextQuestionNumber(
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

/**
 * Returns `true` if a question with substantially identical text already
 * exists for the given rollup (normalised whitespace + case-insensitive).
 */
export async function isDuplicate(
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
