import { openai, RANKER_MODEL } from "./constants";
import { RANKER_PROMPT } from "./prompts";
import { parseLLMJson, normalizeTitle, retryAsync } from "./utils";

export interface RankedArticle {
    articleId: bigint;
    title: string;
    tier: number;
}

/** Send article headlines to the ranker LLM and return tier assignments. */
export async function rankArticles(
    articles: Array<{ article_id: bigint; title: string; summary: string | null }>
): Promise<RankedArticle[]> {
    if (articles.length === 0) return [];

    // Cap at 200 to stay within context window
    const articlesToRank = articles.slice(0, 200);

    const headlineList = articlesToRank.map((a, idx) => `${idx + 1}. ${a.title}`).join("\n");

    const rankingResponse = await retryAsync(() =>
        openai.chat.completions.create({
            model: RANKER_MODEL,
            messages: [{ role: "user", content: RANKER_PROMPT(headlineList) }],
        })
    );

    const raw = rankingResponse.choices[0].message.content || "[]";
    const rankerParsed = parseLLMJson<Array<{ title: string; difficulty: number }>>(raw);

    // Build a title→article map for fast lookup (normalized)
    const titleToArticle = new Map<string, (typeof articlesToRank)[0]>();
    for (const a of articlesToRank) {
        titleToArticle.set(normalizeTitle(a.title), a);
    }

    const selectedArticles: RankedArticle[] = [];
    const seenIds = new Set<bigint>();

    for (const item of rankerParsed) {
        const tier = Math.max(1, Math.min(5, Math.round(Number(item.difficulty))));
        const normalizedLlmTitle = normalizeTitle(item.title || "");

        // Exact normalized match
        let matched = titleToArticle.get(normalizedLlmTitle);

        // Fallback: substring match (LLM may truncate with "...")
        if (!matched) {
            const truncated = normalizedLlmTitle.replace(/\.{3}$/, "").trim();
            if (truncated.length >= 20) {
                for (const [key, article] of titleToArticle) {
                    if (key.startsWith(truncated) || truncated.startsWith(key.substring(0, truncated.length))) {
                        matched = article;
                        break;
                    }
                }
            }
        }

        if (!matched) {
            console.warn(`Ranker returned unmatched title: "${item.title}"`);
            continue;
        }

        if (seenIds.has(matched.article_id)) continue;
        seenIds.add(matched.article_id);

        selectedArticles.push({ articleId: matched.article_id, title: matched.title, tier });
    }

    console.log(`Ranker: ${selectedArticles.length}/${rankerParsed.length} LLM picks matched (${articlesToRank.length} candidates)`);

    return selectedArticles;
}
