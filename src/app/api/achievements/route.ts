import { NextResponse } from "next/server";
import { getAllAchievements } from "@/lib/services/achievement.service";

export async function GET() {
    try {
        const data = await getAllAchievements();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching achievements:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch achievements" },
            { status: 500 },
        );
    }
}
