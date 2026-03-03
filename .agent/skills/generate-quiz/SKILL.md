---
name: generate-quiz
description: generate quiz questions for any planet **ONLY use when user allow you, this skill is different from `scripts/generate-quiz.ts`**
---

# WORKFLOW

## Step 1 — Receive Instructions and Parameters

1. The user will provide the required "rollup name (string, required)", "level count (optional)", and "question count (required)".
2. If re-confirming with the user clarifies the task, please ask for confirmation and wait for their reply.

## Step 2 — Verify Rollup Name Status

1. use command `npx tsx .agent/skills/generate-quiz/scripts/list-questions.ts {rollup-name}` to show latest questions.
2. If the rollup name is not found in the `planets` table, use `npm run graph -- {rollup-name}` to check if it exists in external information sources.

## Step 3 — Confirm User Requirements

1. If the {rollup name} exists in neither the database nor external sources, ask the user if they want to "create a new planet with this rollup name and generate {level count} questions".
2. If the {rollup name} exists in the database, ask the user if they want to "add new questions".
3. **Based on the user's needs, decide whether to initiate "Command Mode" (to create a new planet) or "Manual Mode" (if the rollup name already exists in the database).**

## Step 4 — follow the mode

### Command Mode

1. Determine whether the user-entered {rollup name} appears in the output of the recent `npm run graph -- {rollup-name}` command (or if a similar rollup name exists). **If further user questioning would improve your accuracy, please ask them.**
2. Use command `npx tsx scripts/generate-quiz.ts --rollup {rollup} --count {The number of questions you need to generate}` or `npx tsx scripts/generate-quiz.ts -r {rollup} -c {The number of questions you need to generate}`to generate new questions for the user.
3. this command may ask you the "overview", you may give a brief overview of this rollup name. And it requires starting with the simplest questions.
4. wait for about 6 minutes.
5. finished. and tell user, briefly.

### Manual Mode

**always** follow these rules.

#### Manual Mode Step 1 — Read and analyze existing topics on this planet

1. read following questions that exist.
2. **If understanding reference sources helps you generate questions**, you may use command `npm run graph -- {rollup-name}` to view the plan for this planet to determine the current topic level. Then use command `npm run tree -- {roadmap-name} "{children-name}"` to read the reference sources.

#### Manual Mode Step 2 — Question Design Principles

**ALWAYS FOLLOW** Question Design Principles

- All content is written in **English**.
- Ensure each question directly relates to the core topic.
- Create questions based on this level's theme, ensuring no duplication with previous questions.
- `explanation` is used to clarify foundational concepts and the rationale for the correct answer. Less than 30 words.
- Provide exactly 4 options per question, with incorrect options distinguishable from the correct answer. Each option must be under 10 words.
- Exclude options like “All of the above” or “None of the above.”
- Distribute `correct_option_index` evenly across the 0, 1, 2, 3 range.
- Ensure consistent difficulty within the same level.
- The difficulty level of your questions must start from `the level_number of the last question + 1`.
- `title` Enter the name of this level

#### Manual Mode Step 3 — Write and Store the Question

**ALWAYS** save `questions_{generate_time}.json` under `src/generated/questions`

`questions_{generate_time}.json` format — each object requires `rollup`, `level_number`, `title`, `question_text`, `options`, `correct_option_index`, `explanation`:

```json
[
  {
    "rollup": "prompt",
    "level_number": 2,
    "title": "Zero-shot vs Few-shot",
    "question_text": "...",
    "options": ["A","B","C","D"],
    "correct_option_index": 1,
    "explanation": "..."
  }
]
```

**Field Rules:**
| Field | Constraint |
| :--- | :--- |
| `options` | Must be a JSON array (exactly 4 strings recommended) |
| `correct_option_index` | 0-indexed, must be ≥ 0 |
| `title` | Enter the name of this level |
| `(rollup, level_number, question_number)` | Must be unique |

#### Manual Mode Step 4 — Insert the Question

use command `npx tsx .agent/skills/generate-quiz/scripts/insert-question.ts --file src/generated/questions/questions_{generate_time}.json --yes` to insert questions into the database.

If there are any trouble, you can read `references/TROUBLESHOOTING.md`