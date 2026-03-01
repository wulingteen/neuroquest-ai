import { NextResponse } from "next/server";
import {
    getScanRunDetail,
    getScanRunsList,
} from "@/lib/services/news.service";

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

        // Detail view for a specific run
        if (runIdParam) {
            const run = await getScanRunDetail(BigInt(runIdParam));

            if (!run) {
                return NextResponse.json({ error: "Run not found" }, { status: 404 });
            }

            return NextResponse.json(run);
        }

        // List view — recent scan runs
        const limit = parseInt(limitParam || "10", 10) || 10;
        const runs = await getScanRunsList(limit);
        return NextResponse.json({ runs });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown Error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
