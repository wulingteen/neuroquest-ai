/**
 * I/O helpers: file reading, interactive prompts, preview formatting.
 */

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import type { QuestionInput, ResolvedQuestion } from "./types.js";
import type { ExistingLevelInfo } from "./db.js";
import type { TitleConflict } from "./validation.js";

// ─── File Input ──────────────────────────────────────────────────────────────

/**
 * Reads and parses a JSON file containing an array of QuestionInput objects.
 * Throws on file-read or parse errors.
 */
export function readBatchFile(filePath: string): QuestionInput[] {
    let raw: string;
    try {
        raw = readFileSync(filePath, "utf-8");
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Cannot read file "${filePath}": ${msg}`);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`Invalid JSON in file "${filePath}".`);
    }

    if (!Array.isArray(parsed)) {
        throw new Error("JSON file must contain an array of question objects.");
    }

    return parsed as QuestionInput[];
}

// ─── Interactive Confirmation ────────────────────────────────────────────────

/**
 * Prompts the user with a [y/N] question and resolves to a boolean.
 */
export async function confirm(message: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(`${message} [y/N] `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
        });
    });
}

// ─── Preview Formatting ─────────────────────────────────────────────────────

/**
 * Prints a formatted preview table of resolved questions to stdout.
 */
export function printPreview(resolved: ResolvedQuestion[]): void {
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
}

// ─── Pre-flight Notices ──────────────────────────────────────────────────────

/**
 * Displays detailed info about existing levels found in the database.
 * Returns a user-friendly summary string for confirmation prompts.
 */
export function printExistingLevels(levels: ExistingLevelInfo[]): void {
    console.log("┌─────────────────────────────────────────────────────────────┐");
    console.log("│               ⚠️  Existing Level(s) Detected                │");
    console.log("└─────────────────────────────────────────────────────────────┘\n");
    console.log("  The following level(s) already exist in the database:\n");

    for (const l of levels) {
        console.log(`  📂 rollup="${l.rollup}"  level_number=${l.level_number}`);
        console.log(`     title: "${l.title}"`);
        console.log(`     existing questions: ${l.question_count}`);
        console.log();
    }

    console.log("  If you continue, new questions will be APPENDED to these");
    console.log("  existing levels (question_number will continue from the");
    console.log("  current maximum). The level title will NOT be changed.\n");
}

/**
 * Displays title conflicts — cases where the same (rollup, level_number)
 * pair has multiple different titles in the batch.
 */
export function printTitleConflicts(conflicts: TitleConflict[]): void {
    console.log("┌─────────────────────────────────────────────────────────────┐");
    console.log("│              ❌ Title Conflict(s) Detected                  │");
    console.log("└─────────────────────────────────────────────────────────────┘\n");
    console.log("  The same (rollup, level_number) pair has multiple different");
    console.log("  titles in your input. Only one title can be used per level.\n");

    for (const c of conflicts) {
        console.log(`  📂 rollup="${c.rollup}"  level_number=${c.level_number}`);
        console.log(`     conflicting titles:`);
        for (const t of c.titles) {
            console.log(`       • "${t}"`);
        }
        console.log();
    }

    console.log("  Please fix the input so each (rollup, level_number) pair");
    console.log("  has exactly one title, then retry.\n");
}

/**
 * Displays a notice when the batch targets multiple planets (rollups).
 * This may be intentional but is worth flagging.
 */
export function printMultiRollupNotice(rollups: string[]): void {
    console.log("┌─────────────────────────────────────────────────────────────┐");
    console.log("│           ℹ️  Multiple Planets Detected in Batch             │");
    console.log("└─────────────────────────────────────────────────────────────┘\n");
    console.log("  This batch targets the following planets:\n");

    for (const r of rollups) {
        console.log(`    🪐 ${r}`);
    }
    console.log();
    console.log("  Questions will be distributed across all listed planets.\n");
}

