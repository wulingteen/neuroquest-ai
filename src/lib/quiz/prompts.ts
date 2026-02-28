/**
 * Prompt template for the quiz question generation pipeline.
 *
 * The LLM receives:
 *  - Planet metadata (rollup, label, subtitle, description)
 *  - Existing questions for context (capped to prevent token overflow)
 *  - The number of new questions to produce
 *  - Whether all questions should be at the same difficulty level
 *
 * It returns a JSON array, optionally sorted from easiest → hardest.
 */

import { MAX_CONTEXT_QUESTIONS } from "./constants";

export interface ExistingQuestion {
    question_id: number;
    level_number: number;
    question_number: number;
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string | null;
    xp_reward: number;
}

export interface PlanetInfo {
    rollup: string;
    label: string;
    subtitle: string | null;
    description: string | null;
}

/**
 * Build the prompt for quiz question generation.
 *
 * When there are more existing questions than MAX_CONTEXT_QUESTIONS, only the
 * most recent (highest question_id) questions are included — they represent
 * the hardest difficulty the LLM needs to beat.
 */
export function buildQuizGeneratorPrompt(
    planet: PlanetInfo,
    existingQuestions: ExistingQuestion[],
    count: number,
    sameDifficulty = false,
): string {
    // Cap context to avoid blowing the token budget.
    // Keep the TAIL (hardest / most recent) questions as that's what matters.
    const totalExisting = existingQuestions.length;
    const contextQuestions =
        totalExisting > MAX_CONTEXT_QUESTIONS
            ? existingQuestions.slice(-MAX_CONTEXT_QUESTIONS)
            : existingQuestions;

    const truncationNote =
        totalExisting > MAX_CONTEXT_QUESTIONS
            ? `\n> **Note:** Showing the ${MAX_CONTEXT_QUESTIONS} most recent (hardest) out of ${totalExisting} total questions.\n`
            : "";

    const existingBlock =
        contextQuestions.length > 0
            ? `
### Existing Questions (${contextQuestions.length}${totalExisting > MAX_CONTEXT_QUESTIONS ? ` of ${totalExisting}` : ""} total, sorted by question_id ascending)
${truncationNote}
\`\`\`json
${JSON.stringify(
                contextQuestions.map((q) => ({
                    question_id: q.question_id,
                    level_number: q.level_number,
                    question_text: q.question_text,
                    options: q.options,
                    correct_option_index: q.correct_option_index,
                    explanation: q.explanation,
                    xp_reward: q.xp_reward,
                })),
                null,
                2,
            )}
\`\`\`
`
            : "\n(No existing questions for this planet yet.)\n";

    return `You are an expert AI / GenAI educator creating quiz questions for a gamified learning platform called **NeuroQuest AI**.

## Target Planet
- **Rollup (ID):** ${planet.rollup}
- **Label:** ${planet.label}
- **Subtitle / Topic:** ${planet.subtitle ?? "N/A"}
- **Description:** ${planet.description ?? "N/A"}

## Context — Existing Questions
Below are the quiz questions that already exist for this planet. Study them carefully so you understand the current difficulty level.
${existingBlock}

## Your Task
Generate exactly **${count}** NEW multiple-choice questions for the planet topic above.

### Rules
1. **Significantly harder**: Every new question must be noticeably more difficult than the existing ones. If no existing questions are present, start at an intermediate level and ramp up.
2. ${sameDifficulty
            ? `**Uniform difficulty**: All ${count} questions must be at the **same** advanced difficulty level — the hardest tier you can produce for this topic. Do NOT vary the difficulty across questions. Cover different sub-topics but keep the challenge consistent.`
            : `**Sorted easiest → hardest**: Arrange the ${count} questions in ascending order of difficulty (the first is the easiest of the new batch; the last is the hardest).`}
3. **No duplicates**: Do NOT repeat or rephrase any existing question.
4. **4 options each**: Each question must have exactly 4 answer options (indices 0–3).
5. **Explanation required**: Provide a clear, educational explanation for why the correct answer is right.
6. **Topic scope**: Questions must be about **${planet.subtitle ?? planet.label}** — the planet's core topic. Be creative with sub-topics, real-world applications, edge cases, and advanced theory.
7. **Language**: Write all content in English.

### Output Format
Return **ONLY** a valid JSON array (no markdown fences, no extra text) with exactly ${count} objects in this shape:

[
  {
    "question_text": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "Why this answer is correct."
  }
]

"correct_option_index" is a 0-based integer (0–3).
${sameDifficulty ? "All questions should be at the SAME advanced difficulty level." : "The array MUST be sorted from easiest to hardest."}`;
}
