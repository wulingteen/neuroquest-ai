import { NextRequest, NextResponse } from "next/server";
import {
    getPendingFriendRequests,
    acceptFriendRequest,
    declineFriendRequest,
} from "@/lib/services/friends.service";

/**
 * GET /api/user/friends/requests
 * Returns all pending friend requests received by the current player.
 */
export async function GET() {
    try {
        const requests = await getPendingFriendRequests();
        return NextResponse.json({ success: true, data: requests });
    } catch (error) {
        console.error("Error fetching friend requests:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch friend requests" },
            { status: 500 },
        );
    }
}

/**
 * POST /api/user/friends/requests
 * Accept or decline a friend request.
 * Body: { "request_id": "123", "action": "accept" | "decline" }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { request_id, action } = body as { request_id?: string; action?: string };

        if (!request_id || typeof request_id !== "string") {
            return NextResponse.json(
                { success: false, error: "request_id is required" },
                { status: 400 },
            );
        }

        if (action !== "accept" && action !== "decline") {
            return NextResponse.json(
                { success: false, error: "action must be 'accept' or 'decline'" },
                { status: 400 },
            );
        }

        const result =
            action === "accept"
                ? await acceptFriendRequest(request_id)
                : await declineFriendRequest(request_id);

        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (error) {
        console.error("Error handling friend request:", error);
        return NextResponse.json(
            { success: false, error: "Failed to handle friend request" },
            { status: 500 },
        );
    }
}
