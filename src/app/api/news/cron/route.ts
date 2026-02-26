import { NextResponse } from "next/server";
import db from "@/lib/db";
import { RSS_FEEDS_LIST } from "@/lib/news/constants";
import { getDateRange } from "@/lib/news/utils";
import { syncFeeds, fetchFeedArticles } from "@/lib/news/feeds";
import { rankArticles, backfillFromUnselected } from "@/lib/news/ranker";
import { generateAndSaveQuestions } from "@/lib/news/examiner";
import { backfillFullText } from "@/lib/news/scraper";

export const maxDuration = 300;

export async function GET() {
    const scanRun = await db.cron_scan_runs.create({
        data: { status: "running" },
    });

    try {
        if (!process.env.OPENROUTER_API_KEY) {
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: "failed", error_message: "Missing OPENROUTER_API_KEY", finished_at: new Date() },
            });
            return NextResponse.json({ error: "Missing OPENROUTER_API_KEY in environment variables." }, { status: 500 });
        }

        // STEP 1 — Sync feed list
        await syncFeeds(RSS_FEEDS_LIST);
        const feeds = await db.rss_feeds.findMany({ where: { enabled: true } });

        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: { total_feeds: feeds.length },
        });

        // STEP 2 — Fetch new RSS articles
        const { yesterdayStart } = getDateRange();
        const { newArticlesCount, feedsOk, feedsFailed } = await fetchFeedArticles(feeds, scanRun.run_id, yesterdayStart);

        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: { feeds_ok: feedsOk, feeds_failed: feedsFailed, articles_found: newArticlesCount },
        });

        // STEP 2.5 — Backfill full_text for all articles missing it
        await backfillFullText();

        // STEP 3 — Collect unselected articles and rank them
        const recentArticles = await db.news_articles.findMany({
            where: {
                published_at: { gte: yesterdayStart },
                news_selections: { none: {} },
            },
            select: { article_id: true, title: true, summary: true },
        });

        if (recentArticles.length === 0) {
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: "completed", articles_selected: 0, finished_at: new Date() },
            });
            return NextResponse.json({ message: "No new articles to rank.", run_id: scanRun.run_id.toString() });
        }

        let selectedArticles = await rankArticles(recentArticles);

        // STEP 3.5 — Backfill: if fewer than 15 articles selected, use unselected DB articles
        if (selectedArticles.length < 15) {
            console.log(`Only ${selectedArticles.length}/15 articles selected, attempting backfill...`);
            selectedArticles = await backfillFromUnselected(selectedArticles);
        }

        if (selectedArticles.length === 0) {
            await db.cron_scan_runs.update({
                where: { run_id: scanRun.run_id },
                data: { status: "completed", articles_selected: 0, finished_at: new Date() },
            });
            return NextResponse.json({
                message: "Ranker returned no matching articles.",
                run_id: scanRun.run_id.toString(),
            });
        }

        // STEP 4 — Generate questions for each selected article
        const today = new Date();
        const cycleDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const examinerStats = await generateAndSaveQuestions(selectedArticles, cycleDate);

        // STEP 5 — Finalize scan run
        await db.cron_scan_runs.update({
            where: { run_id: scanRun.run_id },
            data: {
                status: "completed",
                articles_selected: selectedArticles.length,
                finished_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            run_id: scanRun.run_id.toString(),
            newArticlesFetched: newArticlesCount,
            articlesSelected: selectedArticles.length,
            questionsGenerated: examinerStats.processed,
            questionsFailed: examinerStats.failed,
            feedsOk,
            feedsFailed,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown Error";
        console.error("Cron Job Error:", error);

        await db.cron_scan_runs
            .update({
                where: { run_id: scanRun.run_id },
                data: { status: "failed", error_message: msg.substring(0, 1000), finished_at: new Date() },
            })
            .catch(() => { });

        return NextResponse.json({ error: msg, run_id: scanRun.run_id.toString() }, { status: 500 });
    }
}
