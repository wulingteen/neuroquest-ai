import { NextResponse } from "next/server";
import { getPlayer, updatePlayer } from "@/lib/services/user.service";

export async function GET() {
    try {
        const data = await getPlayer();

        if (!data) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch user profile" },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        await updatePlayer(body);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating profile:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update user profile" },
            { status: 500 },
        );
    }
}
