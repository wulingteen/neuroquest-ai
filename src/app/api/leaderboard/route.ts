import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/services/leaderboard.service";

export async function GET() {
    try {
        const data = await getLeaderboard();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch leaderboard" },
            { status: 500 },
        );
    }
}
