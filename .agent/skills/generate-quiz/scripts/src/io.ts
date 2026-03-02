/**
 * I/O helpers: file reading, interactive prompts, preview formatting.
 */

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import type { QuestionInput, ResolvedQuestion } from "./types.js";

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
