/**
 * XP reward calculation helpers.
 */

import {
    QUESTION_XP_BASE,
    QUESTION_XP_STEP,
    LEVEL_XP_BASE,
    LEVEL_XP_STEP,
} from "./constants.js";

/** Compute the default XP reward for a quiz question at the given level. */
export function calculateQuestionXp(levelNumber: number): number {
    return QUESTION_XP_BASE + (levelNumber - 1) * QUESTION_XP_STEP;
}

/** Compute the XP reward for an auto-created level row. */
export function calculateLevelXp(levelNumber: number): number {
    return LEVEL_XP_BASE + (levelNumber - 1) * LEVEL_XP_STEP;
}
