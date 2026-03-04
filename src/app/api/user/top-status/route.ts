import { NextResponse } from "next/server";
import { getPlayer } from "@/lib/services/user.service";
import { getTopScorerStatus } from "@/lib/services/social.service";

export async function GET() {
    try {
        const player = await getPlayer();
        if (!player) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        const status = await getTopScorerStatus(player.player_id);
        return NextResponse.json({ success: true, data: status });
    } catch (error) {
        console.error("Error fetching top scorer status:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
