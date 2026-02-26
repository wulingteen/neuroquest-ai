/** Prompt templates for LLM calls in the news pipeline. */

export const RANKER_PROMPT = (headlineList: string) => `You are an expert content curator for an AI learning platform.

Below is a numbered list of news article headlines. Your task:
1. Read ALL headlines carefully.
2. Assign exactly 3 articles to EACH of 5 difficulty tiers:
   - Difficulty 1 (Beginner): simple news, easy to understand for newcomers
   - Difficulty 2 (Elementary): slightly technical but still accessible
   - Difficulty 3 (Intermediate): moderate technical depth
   - Difficulty 4 (Advanced): requires solid AI/ML background
   - Difficulty 5 (Expert): cutting-edge research or deep technical content
3. In total you must select exactly 15 articles (3 per tier). Each article may only appear in one tier.
4. If fewer than 15 articles are available, distribute as evenly as possible.

Return ONLY a valid JSON array in exactly this format (no markdown, no extra text):
[
  { "title": "exact article headline text", "difficulty": 1 },
  { "title": "exact article headline text", "difficulty": 1 },
  { "title": "exact article headline text", "difficulty": 1 },
  { "title": "exact article headline text", "difficulty": 2 },
  ...
]

The "title" field MUST exactly match one of the headlines below (character-for-character).
The "difficulty" field MUST be an integer from 1 to 5.

Headlines:
${headlineList}
`;

export const EXAMINER_PROMPT = (title: string, content: string) => `You are an expert reading comprehension teacher. Based on the following article, create exactly 3 multiple-choice questions.
Each question must have exactly 4 options and test different aspects of comprehension (main idea, detail, inference).

Return ONLY a valid JSON array in exactly this format, with no other text or markdown:
[
  {
    "question_text": "text of the question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "Explanation for why the answer is correct"
  }
]

Rules:
- "correct_option_index" must be an integer from 0 to 3 corresponding to the correct option.
- Provide exactly 3 question objects in the array.

Article Title: ${title}
Article Content:
${content}
`;
