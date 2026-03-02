/**
 * Shared type definitions for the insert-question pipeline.
 */

/** Raw input supplied by the operator (CLI flags or JSON file). */
export interface QuestionInput {
    rollup: string;
    level_number: number;
    title: string;
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string;
    xp_reward?: number;
}

/** Fully resolved question with computed bookkeeping fields. */
export interface ResolvedQuestion {
    rollup: string;
    level_number: number;
    question_number: number;
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string;
    xp_reward: number;
}

/** Parsed CLI arguments. */
export interface CliArgs {
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
