import { NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * GET /api/news/selections
 *
 * Returns the latest cycle_date's selected articles grouped by tier,
 * each with its associated questions.
 *
 * Query params:
 *   date — optional cycle_date (YYYY-MM-DD); defaults to the most recent cycle_date
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get("date");

        // Determine the target cycle_date
        let cycleDate: Date;
        if (dateParam) {
            cycleDate = new Date(dateParam);
        } else {
            // Find the most recent cycle_date
            const latest = await db.news_selections.findFirst({
                orderBy: { cycle_date: "desc" },
                select: { cycle_date: true },
            });
            if (!latest) {
                return NextResponse.json({ items: [], cycle_date: null });
            }
            cycleDate = latest.cycle_date;
        }

        // Fetch all selections for the cycle_date, joined with article + questions
        const selections = await db.news_selections.findMany({
            where: { cycle_date: cycleDate },
            orderBy: [{ tier: "asc" }, { selection_id: "asc" }],
            include: {
                news_articles: {
                    include: {
                        rss_feeds: {
                            select: { name: true },
                        },
                    },
                },
                news_questions: {
                    orderBy: { question_number: "asc" },
                },
            },
        });

        // Map tier to category label + colour
        const tierMeta: Record<number, { category: string; categoryColor: string }> = {
            1: { category: "入門", categoryColor: "#10B981" },       // green
            2: { category: "基礎", categoryColor: "#3B82F6" },       // blue
            3: { category: "進階", categoryColor: "#8B5CF6" },       // purple
            4: { category: "高階", categoryColor: "#F97316" },       // orange
            5: { category: "專家", categoryColor: "#EF4444" },       // red
        };

        const items = selections.map((sel) => {
            const article = sel.news_articles;
            const meta = tierMeta[sel.tier] ?? tierMeta[3];

            // Calculate total xp reward from all questions
            const totalXp = sel.news_questions.reduce(
                (sum, q) => sum + (q.xp_reward ?? 50),
                0
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

        return NextResponse.json({
            cycle_date: cycleDate.toISOString().slice(0, 10),
            items,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
