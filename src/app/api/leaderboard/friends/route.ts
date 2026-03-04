import { NextResponse } from "next/server";
import { getFriendsLeaderboard } from "@/lib/services/friends.service";

/**
 * GET /api/leaderboard/friends
 * Returns the friends leaderboard (current player + their friends sorted by XP).
 */
export async function GET() {
    try {
        const data = await getFriendsLeaderboard();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching friends leaderboard:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch friends leaderboard" },
            { status: 500 },
        );
    }
}
