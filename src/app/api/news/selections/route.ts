import { NextResponse } from "next/server";
import { getSelections } from "@/lib/services/news.service";

/**
 * GET /api/news/selections
 *
 * Returns the latest cycle_date's selected articles grouped by tier,
 * each with its associated questions.
 *
 * Query params:
 *   date    — optional cycle_date (YYYY-MM-DD); defaults to the most recent
 *   maxTier — optional max tier filter (1–5)
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get("date") ?? undefined;
        const maxTierParam = searchParams.get("maxTier");
        const maxTier = maxTierParam ? Number(maxTierParam) : undefined;

        const result = await getSelections({ date, maxTier });
        return NextResponse.json(result);
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
