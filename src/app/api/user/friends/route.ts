import { NextRequest, NextResponse } from "next/server";
import { getFriends, sendFriendRequest, removeFriend } from "@/lib/services/friends.service";

/**
 * GET /api/user/friends
 * Returns the current player's confirmed friends list sorted by XP.
 */
export async function GET() {
    try {
        const friends = await getFriends();
        return NextResponse.json({ success: true, data: friends });
    } catch (error) {
        console.error("Error fetching friends:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch friends" },
            { status: 500 },
        );
    }
}

/**
 * POST /api/user/friends
 * Send a friend request by username (requires other party's consent).
 * Body: { "username": "FriendName" }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { username } = body as { username?: string };

        if (!username || typeof username !== "string") {
            return NextResponse.json(
                { success: false, error: "username is required" },
                { status: 400 },
            );
        }

        const result = await sendFriendRequest(username.trim());
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (error) {
        console.error("Error sending friend request:", error);
        return NextResponse.json(
            { success: false, error: "Failed to send friend request" },
            { status: 500 },
        );
    }
}

/**
 * DELETE /api/user/friends
 * Remove a confirmed friend by username.
 * Body: { "username": "FriendName" }
 */
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { username } = body as { username?: string };

        if (!username || typeof username !== "string") {
            return NextResponse.json(
                { success: false, error: "username is required" },
                { status: 400 },
            );
        }

        const result = await removeFriend(username.trim());
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (error) {
        console.error("Error removing friend:", error);
        return NextResponse.json(
            { success: false, error: "Failed to remove friend" },
            { status: 500 },
        );
    }
}
