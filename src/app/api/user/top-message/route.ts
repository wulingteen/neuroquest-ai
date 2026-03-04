import { NextResponse } from "next/server";
import { getPlayer } from "@/lib/services/user.service";
import { setDailyTopMessage } from "@/lib/services/social.service";

export async function POST(request: Request) {
    try {
        const player = await getPlayer();
        if (!player) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        const { message } = await request.json();

        if (!message || message.length > 20) {
            return NextResponse.json(
                { success: false, error: "Invalid message (max 20 chars)" },
                { status: 400 },
            );
        }

        await setDailyTopMessage(player.player_id, message);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error setting daily top message:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
