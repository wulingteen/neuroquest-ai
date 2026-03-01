import { NextResponse } from "next/server";
import { getAllChallenges } from "@/lib/services/arena.service";

export async function GET() {
    try {
        const data = await getAllChallenges();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching arena challenges:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch arena challenges" },
            { status: 500 },
        );
    }
}
