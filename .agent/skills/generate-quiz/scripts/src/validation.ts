/**
 * Input validation for quiz question payloads.
 */

import {
    MAX_QUESTION_TEXT_LENGTH,
    MAX_FIELD_LENGTH,
    REQUIRED_OPTION_COUNT,
} from "./constants.js";
import type { QuestionInput } from "./types.js";

/**
 * Validates a single QuestionInput and returns an array of error messages.
 * An empty array indicates a valid input.
 *
 * @param q     - The question input to validate.
 * @param index - Zero-based index (used for error prefixing in batch mode).
 */
export function validateInput(q: QuestionInput, index: number): string[] {
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

/**
 * Validates an entire batch of inputs.
 * Throws with a formatted message on first batch with errors.
 */
export function validateBatch(inputs: QuestionInput[]): void {
    const allErrors: string[] = [];
    for (let i = 0; i < inputs.length; i++) {
        allErrors.push(...validateInput(inputs[i], i));
    }
    if (allErrors.length > 0) {
        const formatted = allErrors.map((e) => `  ${e}`).join("\n");
        throw new Error(`Validation errors:\n\n${formatted}`);
    }
}

// ─── Batch Consistency Checks ────────────────────────────────────────────────

/** A conflict where the same (rollup, level_number) has multiple titles. */
export interface TitleConflict {
    rollup: string;
    level_number: number;
    titles: string[];
}

/**
 * Detects cases where the same (rollup, level_number) pair appears with
 * different `title` values in the batch. This is ambiguous because only
 * one title can be used for the level row.
 *
 * Returns an empty array if there are no conflicts.
 */
export function detectTitleConflicts(inputs: QuestionInput[]): TitleConflict[] {
    const titleMap = new Map<string, Set<string>>();
    for (const q of inputs) {
        const key = `${q.rollup.trim()}:${q.level_number}`;
        if (!titleMap.has(key)) titleMap.set(key, new Set());
        titleMap.get(key)!.add(q.title.trim());
    }

    const conflicts: TitleConflict[] = [];
    for (const [key, titles] of titleMap) {
        if (titles.size > 1) {
            const [rollup, levelStr] = key.split(":");
            conflicts.push({
                rollup,
                level_number: parseInt(levelStr, 10),
                titles: [...titles],
            });
        }
    }
    return conflicts;
}
