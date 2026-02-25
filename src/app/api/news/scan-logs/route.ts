import { NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * GET /api/news/scan-logs
 *
 * Query params:
 *   limit  — number of runs to return (default 10, max 50)
 *   run_id — if provided, return detail for a specific run including per-feed logs
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const runIdParam = searchParams.get("run_id");
        const limitParam = searchParams.get("limit");
        const limit = Math.min(Math.max(parseInt(limitParam || "10", 10) || 10, 1), 50);

        // Detail view for a specific run
        if (runIdParam) {
            const runId = BigInt(runIdParam);
            const run = await db.cron_scan_runs.findUnique({
                where: { run_id: runId },
                include: {
                    feed_logs: {
                        orderBy: { created_at: "asc" },
                    }
                }
            });

            if (!run) {
                return NextResponse.json({ error: "Run not found" }, { status: 404 });
            }

            // Serialize BigInt values
            return NextResponse.json({
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
                duration_ms: run.finished_at
                    ? new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
                    : null,
                feed_logs: run.feed_logs.map(log => ({
                    log_id: log.log_id.toString(),
                    feed_id: log.feed_id.toString(),
                    feed_url: log.feed_url,
                    feed_name: log.feed_name,
                    status: log.status,
                    articles_found: log.articles_found,
                    error_message: log.error_message,
                    duration_ms: log.duration_ms,
                    created_at: log.created_at,
                }))
            });
        }

        // List view — recent scan runs
        const runs = await db.cron_scan_runs.findMany({
            orderBy: { started_at: "desc" },
            take: limit,
        });

        return NextResponse.json({
            runs: runs.map(r => ({
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
                duration_ms: r.finished_at
                    ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
                    : null,
            }))
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown Error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
