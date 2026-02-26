import db from "@/lib/db";
import { openai, RANKER_MODEL } from "./constants";
import { RANKER_PROMPT } from "./prompts";
import { parseLLMJson, normalizeTitle, retryAsync } from "./utils";

export interface RankedArticle {
    articleId: bigint;
    title: string;
    tier: number;
}

const TARGET_TOTAL = 15;
const ARTICLES_PER_TIER = 3;
const TIER_COUNT = 5;

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

/**
 * When the LLM ranker selects fewer than 15 articles (because too few were
 * scanned that day), backfill the remaining slots with unselected articles
 * from the database.
 *
 * - Only runs when `selected.length < 15`.
 * - Pulls from `news_articles` that have *no* entry in `news_selections`
 *   and are *not* already in the current selection.
 * - Distributes supplementary articles round-robin across tiers that still
 *   need articles (each tier targets 3).
 * - Prioritises more recent articles (sorted by `published_at DESC`).
 */
export async function backfillFromUnselected(
    selected: RankedArticle[]
): Promise<RankedArticle[]> {
    if (selected.length >= TARGET_TOTAL) return selected;

    // Count how many articles are already assigned per tier
    const tierCounts = new Map<number, number>();
    for (let t = 1; t <= TIER_COUNT; t++) tierCounts.set(t, 0);
    const alreadySelectedIds = new Set<bigint>();

    for (const s of selected) {
        tierCounts.set(s.tier, (tierCounts.get(s.tier) ?? 0) + 1);
        alreadySelectedIds.add(s.articleId);
    }

    // Build list of tiers that still need articles, in order
    const tiersNeedingMore: number[] = [];
    for (let t = 1; t <= TIER_COUNT; t++) {
        const need = ARTICLES_PER_TIER - (tierCounts.get(t) ?? 0);
        for (let n = 0; n < need; n++) tiersNeedingMore.push(t);
    }

    if (tiersNeedingMore.length === 0) return selected;

    // Query unselected articles from the database (never selected before)
    const slotsNeeded = tiersNeedingMore.length;
    const candidates = await db.news_articles.findMany({
        where: {
            news_selections: { none: {} },
            article_id: { notIn: [...alreadySelectedIds] },
        },
        orderBy: { published_at: "desc" },
        take: slotsNeeded,
        select: { article_id: true, title: true },
    });

    if (candidates.length === 0) {
        console.log("Backfill: no unselected articles available in the database.");
        return selected;
    }

    // Assign supplementary articles to tiers round-robin
    const supplementary: RankedArticle[] = [];
    for (let i = 0; i < candidates.length && i < tiersNeedingMore.length; i++) {
        supplementary.push({
            articleId: candidates[i].article_id,
            title: candidates[i].title,
            tier: tiersNeedingMore[i],
        });
    }

    console.log(
        `Backfill: added ${supplementary.length} supplementary article(s) ` +
        `(total now ${selected.length + supplementary.length}/${TARGET_TOTAL})`
    );

    return [...selected, ...supplementary];
}
