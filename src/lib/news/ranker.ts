import { openai, RANKER_MODEL } from "./constants";
import { parseLLMJson } from "./utils";

export interface RankedArticle {
    articleId: bigint;
    title: string;
    tier: number;
}

/** Send article headlines to the ranker LLM and return tier assignments. */
export async function rankArticles(
    articles: Array<{ article_id: bigint; title: string; summary: string | null }>
): Promise<RankedArticle[]> {
    // Cap at 200 to stay within context window
    const articlesToRank = articles.slice(0, 200);

    const headlineList = articlesToRank.map((a, idx) => `${idx + 1}. ${a.title}`).join("\n");

    const rankerPrompt = `You are an expert content curator for an AI learning platform.

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

    const rankingResponse = await openai.chat.completions.create({
        model: RANKER_MODEL,
        messages: [{ role: "user", content: rankerPrompt }],
    });

    const raw = rankingResponse.choices[0].message.content || "[]";
    const rankerParsed = parseLLMJson<Array<{ title: string; difficulty: number }>>(raw);

    // Build a title→article map for fast lookup (case-insensitive, trimmed)
    const titleToArticle = new Map<string, (typeof articlesToRank)[0]>();
    for (const a of articlesToRank) {
        titleToArticle.set(a.title.trim().toLowerCase(), a);
    }

    const selectedArticles: RankedArticle[] = [];

    for (const item of rankerParsed) {
        const tier = Math.max(1, Math.min(5, Math.round(Number(item.difficulty))));
        const normalizedTitle = (item.title || "").trim().toLowerCase();

        const matched = titleToArticle.get(normalizedTitle);
        if (!matched) {
            console.warn(`Ranker returned unmatched title: "${item.title}"`);
            continue;
        }

        if (selectedArticles.some((s) => s.articleId === matched.article_id)) continue;

        selectedArticles.push({ articleId: matched.article_id, title: matched.title, tier });
    }

    return selectedArticles;
}
