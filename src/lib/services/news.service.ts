import db from "@/lib/db";
import { PLAYER_USERNAME } from "./constants";

// ─── Selections DTOs ─────────────────────────────────────────────────────────

export interface NewsQuestionDTO {
    id: number;
    number: number;
    question: string | null;
    options: unknown;
    correct: number | null;
    explanation: string | null;
    xp: number;
}

export interface NewsSelectionDTO {
    id: string;
    articleId: string;
    title: string;
    summary: string;
    url: string;
    date: string;
    source: string;
    tier: number;
    category: string;
    categoryColor: string;
    reward: number;
    completed: boolean;
    questions: NewsQuestionDTO[];
}

// ─── Tier metadata ───────────────────────────────────────────────────────────

const TIER_META: Record<number, { category: string; categoryColor: string }> = {
    1: { category: "入門", categoryColor: "#10B981" },
    2: { category: "基礎", categoryColor: "#3B82F6" },
    3: { category: "進階", categoryColor: "#8B5CF6" },
    4: { category: "高階", categoryColor: "#F97316" },
    5: { category: "專家", categoryColor: "#EF4444" },
};

// ─── Selections ──────────────────────────────────────────────────────────────

export async function getSelections(params: {
    date?: string;
    maxTier?: number;
}): Promise<{ cycle_date: string | null; items: NewsSelectionDTO[] }> {
    const { date: dateParam, maxTier: maxTierParam } = params;
    const maxTier = maxTierParam
        ? Math.min(5, Math.max(1, maxTierParam))
        : null;

    // Determine the target cycle_date
    let cycleDate: Date;
    if (dateParam) {
        cycleDate = new Date(dateParam);
    } else {
        const latest = await db.news_selections.findFirst({
            orderBy: { cycle_date: "desc" },
            select: { cycle_date: true },
        });
        if (!latest) {
            return { cycle_date: null, items: [] };
        }
        cycleDate = latest.cycle_date;
    }

    // Fetch all selections for the cycle_date
    const selections = await db.news_selections.findMany({
        where: {
            cycle_date: cycleDate,
            ...(maxTier ? { tier: { lte: maxTier } } : {}),
        },
        orderBy: [{ tier: "asc" }, { selection_id: "asc" }],
        include: {
            news_articles: {
                include: {
                    rss_feeds: { select: { name: true } },
                },
            },
            news_questions: {
                orderBy: { question_number: "asc" },
            },
        },
    });

    // Cap at 3 articles per tier (cron may have run more than once on the same day,
    // creating duplicate tier entries for the same cycle_date).
    const tierCount = new Map<number, number>();
    const cappedSelections = selections.filter((sel) => {
        const count = tierCount.get(sel.tier) ?? 0;
        if (count >= 3) return false;
        tierCount.set(sel.tier, count + 1);
        return true;
    });

    // ── Check which selections the player has already completed ──────────
    const player = await db.players.findUnique({
        where: { username: PLAYER_USERNAME },
    });

    // Collect ALL question IDs across all capped selections
    const allQuestionIds = cappedSelections.flatMap((sel) =>
        sel.news_questions.map((q) => q.question_id),
    );

    // Query answered question IDs in a single round-trip
    const answeredQuestionIds = new Set<bigint>();
    if (player && allQuestionIds.length > 0) {
        const answered = await db.player_news_answers.findMany({
            where: {
                player_id: player.player_id,
                question_id: { in: allQuestionIds },
            },
            select: { question_id: true },
        });
        for (const a of answered) {
            answeredQuestionIds.add(a.question_id);
        }
    }

    const items: NewsSelectionDTO[] = cappedSelections.map((sel) => {
        const article = sel.news_articles;
        const meta = TIER_META[sel.tier] ?? TIER_META[3];

        const totalXp = sel.news_questions.reduce(
            (sum, q) => sum + (q.xp_reward ?? 50),
            0,
        );

        // A selection is "completed" when ALL its questions have been answered
        const completed =
            sel.news_questions.length > 0 &&
            sel.news_questions.every((q) =>
                answeredQuestionIds.has(q.question_id),
            );

        return {
            id: sel.selection_id.toString(),
            articleId: article.article_id.toString(),
            title: article.title,
            summary: article.summary ?? "",
            url: article.url,
            date: article.published_at
                ? new Date(article.published_at).toISOString().slice(0, 10)
                : new Date(article.fetched_at).toISOString().slice(0, 10),
            source: article.rss_feeds.name,
            tier: sel.tier,
            category: meta.category,
            categoryColor: meta.categoryColor,
            reward: totalXp,
            completed,
            questions: sel.news_questions.map((q) => ({
                id: Number(q.question_id),
                number: q.question_number,
                question: q.question_text,
                options: q.options as string[],
                correct: q.correct_option_index,
                explanation: q.explanation ?? "",
                xp: q.xp_reward,
            })),
        };
    });

    return {
        cycle_date: cycleDate.toISOString().slice(0, 10),
        items,
    };
}

// ─── Scan Logs DTOs ──────────────────────────────────────────────────────────

export interface ScanRunDTO {
    run_id: string;
    status: string;
    total_feeds: number | null;
    feeds_ok: number | null;
    feeds_failed: number | null;
    articles_found: number | null;
    articles_selected: number | null;
    error_message: string | null;
    started_at: Date;
    finished_at: Date | null;
    duration_ms: number | null;
}

export interface ScanFeedLogDTO {
    log_id: string;
    feed_id: string;
    feed_url: string | null;
    feed_name: string | null;
    status: string;
    articles_found: number | null;
    error_message: string | null;
    duration_ms: number | null;
    created_at: Date;
}

function computeDuration(started: Date, finished: Date | null): number | null {
    return finished
        ? new Date(finished).getTime() - new Date(started).getTime()
        : null;
}

// ─── Scan Logs ───────────────────────────────────────────────────────────────

export async function getScanRunDetail(
    runId: bigint,
): Promise<(ScanRunDTO & { feed_logs: ScanFeedLogDTO[] }) | null> {
    const run = await db.cron_scan_runs.findUnique({
        where: { run_id: runId },
        include: {
            feed_logs: { orderBy: { created_at: "asc" } },
        },
    });

    if (!run) return null;

    return {
        run_id: run.run_id.toString(),
        status: run.status,
        total_feeds: run.total_feeds,
        feeds_ok: run.feeds_ok,
        feeds_failed: run.feeds_failed,
        articles_found: run.articles_found,
        articles_selected: run.articles_selected,
        error_message: run.error_message,
        started_at: run.started_at,
        finished_at: run.finished_at,
        duration_ms: computeDuration(run.started_at, run.finished_at),
        feed_logs: run.feed_logs.map((log) => ({
            log_id: log.log_id.toString(),
            feed_id: log.feed_id.toString(),
            feed_url: log.feed_url,
            feed_name: log.feed_name,
            status: log.status,
            articles_found: log.articles_found,
            error_message: log.error_message,
            duration_ms: log.duration_ms,
            created_at: log.created_at,
        })),
    };
}

export async function getScanRunsList(limit: number): Promise<ScanRunDTO[]> {
    const clampedLimit = Math.min(Math.max(limit, 1), 50);

    const runs = await db.cron_scan_runs.findMany({
        orderBy: { started_at: "desc" },
        take: clampedLimit,
    });

    return runs.map((r) => ({
        run_id: r.run_id.toString(),
        status: r.status,
        total_feeds: r.total_feeds,
        feeds_ok: r.feeds_ok,
        feeds_failed: r.feeds_failed,
        articles_found: r.articles_found,
        articles_selected: r.articles_selected,
        error_message: r.error_message,
        started_at: r.started_at,
        finished_at: r.finished_at,
        duration_ms: computeDuration(r.started_at, r.finished_at),
    }));
}
