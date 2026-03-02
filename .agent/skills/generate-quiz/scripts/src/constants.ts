/**
 * Shared constants for the insert-question pipeline.
 */

// ─── Validation Limits ───────────────────────────────────────────────────────

export const MAX_QUESTION_TEXT_LENGTH = 2000;
export const MAX_FIELD_LENGTH = 1000;
export const REQUIRED_OPTION_COUNT = 4;

// ─── XP Formulas ─────────────────────────────────────────────────────────────

/** XP formula for questions: BASE + (level_number - 1) × STEP */
export const QUESTION_XP_BASE = 150;
export const QUESTION_XP_STEP = 50;

/** XP formula for auto-created level rows: 150 + (level_number - 1) × 50 */
export const LEVEL_XP_BASE = 150;
export const LEVEL_XP_STEP = 50;
