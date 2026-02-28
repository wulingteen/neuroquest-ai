/**
 * Prompt template for the quiz question generation pipeline.
 *
 * The LLM receives:
 *  - Planet metadata (rollup, label, subtitle, description)
 *  - Existing questions for context (capped to prevent token overflow)
 *  - The number of new questions to produce
 *  - Whether all questions should be at the same difficulty level
 *  - How many difficulty levels to produce (levelCount)
 *
 * Output format:
 *  - Single-level mode (levelCount undefined / 1): JSON array of questions
 *  - Multi-level mode (levelCount > 1): JSON object with `levels` array
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
    levelCount?: number,
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

    // ── Multi-level mode ──────────────────────────────────────────────
    const useMultiLevel = typeof levelCount === "number" && levelCount > 1;
    const totalQuestions = useMultiLevel ? count * levelCount : count;

    // Task description adapts to mode
    const taskDescription = useMultiLevel
        ? `Generate exactly **${totalQuestions}** NEW multiple-choice questions for the planet topic above, organised into **${levelCount} difficulty levels** with **${count} questions per level**.`
        : `Generate exactly **${count}** NEW multiple-choice questions for the planet topic above.`;

    // Difficulty rule adapts to mode
    let difficultyRule: string;
    if (useMultiLevel) {
        difficultyRule = `**${levelCount} difficulty levels**: Organise the questions into ${levelCount} distinct difficulty tiers numbered 1 (easiest) through ${levelCount} (hardest). Each tier must contain exactly ${count} questions. The difficulty difference between tiers should be clearly noticeable — tier 1 should be approachable for beginners, and tier ${levelCount} should challenge experts. Within each tier, all questions should be at the same difficulty.`;
    } else if (sameDifficulty) {
        difficultyRule = `**Uniform difficulty**: All ${count} questions must be at the **same** advanced difficulty level — the hardest tier you can produce for this topic. Do NOT vary the difficulty across questions. Cover different sub-topics but keep the challenge consistent.`;
    } else {
        difficultyRule = `**Sorted easiest → hardest**: Arrange the ${count} questions in ascending order of difficulty (the first is the easiest of the new batch; the last is the hardest).`;
    }

    // Output format adapts to mode
    let outputFormat: string;
    if (useMultiLevel) {
        outputFormat = `Return **ONLY** a valid JSON object (no markdown fences, no extra text) with this shape:

{
  "levels": [
    {
      "level": 1,
      "questions": [
        {
          "question_text": "The question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_option_index": 0,
          "explanation": "Why this answer is correct."
        }
      ]
    },
    {
      "level": 2,
      "questions": [ ... ]
    }
  ]
}

There must be exactly ${levelCount} objects in the "levels" array (level 1 through ${levelCount}), each containing exactly ${count} questions.
"correct_option_index" is a 0-based integer (0–3).
Level 1 = easiest tier, level ${levelCount} = hardest tier.`;
    } else {
        outputFormat = `Return **ONLY** a valid JSON array (no markdown fences, no extra text) with exactly ${count} objects in this shape:

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
${taskDescription}

### Rules
1. **Significantly harder**: Every new question must be noticeably more difficult than the existing ones. If no existing questions are present, start at an intermediate level and ramp up.
2. ${difficultyRule}
3. **No duplicates**: Do NOT repeat or rephrase any existing question.
4. **4 options each**: Each question must have exactly 4 answer options (indices 0–3).
5. **Explanation required**: Provide a clear, educational explanation for why the correct answer is right.
6. **Topic scope**: Questions must be about **${planet.subtitle ?? planet.label}** — the planet's core topic. Be creative with sub-topics, real-world applications, edge cases, and advanced theory.
7. **Language**: Write all content in English.

### Output Format
${outputFormat}`;
}

// ─── Level Title Prompt ──────────────────────────────────────────────────────

export interface ExistingLevel {
    level_number: number;
    title: string;
    content_type: string;
    xp_reward: number;
}

/**
 * Build a prompt that asks the LLM to generate creative, educational level
 * titles for one or more new levels on a planet.
 *
 * The LLM receives:
 *  - Planet metadata
 *  - Existing levels for context (so it can continue the naming style)
 *  - The level_numbers that need titles
 *
 * Output: JSON array of objects `{ level_number, title }`.
 */
export function buildLevelTitlePrompt(
    planet: PlanetInfo,
    existingLevels: ExistingLevel[],
    newLevelNumbers: number[],
): string {
    const existingBlock =
        existingLevels.length > 0
            ? `
### Existing Levels (for style reference)
\`\`\`json
${JSON.stringify(
                existingLevels.map((l) => ({
                    level_number: l.level_number,
                    title: l.title,
                    content_type: l.content_type,
                })),
                null,
                2,
            )}
\`\`\`
`
            : "\n(No existing levels for this planet yet.)\n";

    const levelList = newLevelNumbers.join(", ");

    return `You are an expert AI / GenAI educator creating level titles for a gamified learning platform called **NeuroQuest AI**.

## Target Planet
- **Rollup (ID):** ${planet.rollup}
- **Label:** ${planet.label}
- **Subtitle / Topic:** ${planet.subtitle ?? "N/A"}
- **Description:** ${planet.description ?? "N/A"}

## Context — Existing Levels
${existingBlock}

## Your Task
Generate creative, concise, and educational titles for level(s): **${levelList}**.

### Rules
1. Each title should reflect a specific sub-topic of **${planet.subtitle ?? planet.label}** appropriate for its difficulty position (higher level_number = more advanced topic).
2. Titles must be concise (3–8 words), descriptive, and engaging — similar to chapter titles in a textbook.
3. Do NOT repeat existing level titles or topics.
4. The content_type for all new levels is "quiz".
5. Write all titles in English.

### Output Format
Return **ONLY** a valid JSON array (no markdown fences, no extra text) with exactly ${newLevelNumbers.length} object(s):

[
  { "level_number": ${newLevelNumbers[0]}, "title": "Example Quiz Title" }
]

Each object must have "level_number" (integer) and "title" (string).`;
}

// ─── Planet Description Prompt ───────────────────────────────────────────────

export interface ExistingPlanetSummary {
    rollup: string;
    description: string | null;
}

/**
 * Build a prompt that asks the LLM to generate structured planet metadata
 * (label, subtitle, description, icon, required_rollup) from a user-provided
 * topic overview.
 *
 * The LLM receives existing planets so it can decide if the new planet should
 * have a prerequisite (`required_rollup`). It may return `null` if none fits.
 *
 * Output: single JSON object `{ label, subtitle, description, icon, required_rollup }`.
 */
export function buildPlanetDescriptionPrompt(
    rollup: string,
    overview: string,
    existingPlanets: ExistingPlanetSummary[],
): string {
    const existingBlock =
        existingPlanets.length > 0
            ? `### Existing Planets
\`\`\`json
${JSON.stringify(
                existingPlanets.map((p) => ({
                    rollup: p.rollup,
                    description: p.description ?? "N/A",
                })),
                null,
                2,
            )}
\`\`\`
`
            : "\n(No existing planets yet.)\n";

    return `You are a creative writer for a gamified GenAI learning platform.

The platform organises topics into "planets". Each planet has:
- **label**: A short, catchy name ending with " Planet" (e.g. "Prompt Planet", "Model Planet").
- **subtitle**: The academic / technical topic name (2–5 words, e.g. "Prompt Engineering", "LLM Fundamentals").
- **description**: A single gamified, action-oriented sentence (10–20 words) that excites learners. It should start with a verb and convey mastery / exploration / discovery.
- **icon**: A single emoji that best represents the topic.
- **required_rollup**: The rollup ID of a prerequisite planet (from the existing list below) that a learner should complete before this one. Set to \`null\` if no prerequisite is needed — for example, when the topic is beginner-friendly, stands on its own, or doesn't logically follow any existing planet.

### Reference Examples
| rollup  | label          | subtitle              | description                                                                 | icon |
|---------|----------------|-----------------------|-----------------------------------------------------------------------------|------|
| prompt  | Prompt Planet  | Prompt Engineering    | Master the power of Prompts and make AI work for you                        | ⚡   |

${existingBlock}
## Your Task
A user wants to create a new planet with rollup **"${rollup}"**. They provided the following topic overview:

> ${overview}

Generate the planet metadata following the style above. Carefully consider the existing planets and decide whether a \`required_rollup\` is appropriate.

### Output Format
Return **ONLY** a valid JSON object (no markdown fences, no extra text):

{
  "label": "Example Planet",
  "subtitle": "Example Topic Name",
  "description": "Action-oriented gamified one-liner about the topic",
  "icon": "🔮",
  "required_rollup": "prompt" or null
}

All values must be strings except \`required_rollup\` which is either a string (one of the existing rollup IDs) or \`null\`. The description must be a single sentence (no period at the end).`;
}

