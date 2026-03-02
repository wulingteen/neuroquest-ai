#!/usr/bin/env npx tsx
/**
 * List the most recent quiz questions for a given planet rollup.
 * Output is formatted as a numbered list for easy LLM consumption.
 *
 * Usage:
 *   npx tsx .agent/skills/generate-quiz/scripts/list-questions.ts <rollup>
 */

import { PrismaClient } from "@prisma/client";

const CONFIG = {
    LIMIT: Number(process.env.QUIZ_LIST_LIMIT) || 20,
};

/**
 * Fetches and displays the latest quiz questions for a specific rollup.
 */
async function listQuestions(prisma: PrismaClient, rollup: string): Promise<void> {
    const questions = await prisma.quiz_questions.findMany({
        where: { rollup },
        orderBy: [{ level_number: "asc" }, { question_number: "asc" }],
        take: CONFIG.LIMIT,
        select: {
            level_number: true,
            question_text: true,
            levels: {
                select: {
                    title: true,
                },
            },
        },
    });

    if (questions.length === 0) {
        console.warn(`No questions found for rollup identifier: "${rollup}"`);
        return;
    }

    console.log(`── ${rollup.toUpperCase()} ── ${questions.length} Questions ──\n`);

    // Group by level for cleaner output
    let currentLevel = -1;
    for (const q of questions) {
        const lvl = q.level_number;
        const title = q.levels?.title ?? "Untitled";
        if (lvl !== currentLevel) {
            currentLevel = lvl;
            console.log(`Level ${lvl}: ${title}`);
        }
        console.log(`  - ${q.question_text}`);
    }
    console.log();
}

async function main(): Promise<void> {
    const rollup = process.argv[2];

    if (!rollup) {
        console.error("Error: Rollup parameter is required.");
        console.error("Usage: npx tsx .agent/skills/generate-quiz/scripts/list-questions.ts <rollup>");
        process.exit(1);
    }

    const prisma = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

    try {
        await listQuestions(prisma, rollup);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        console.error(`❌ Execution Failed: ${message}`);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
