import { NextResponse } from "next/server";
import { getLevels } from "@/lib/services/level.service";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const planetId = searchParams.get("planetId") ?? undefined;
        const data = await getLevels(planetId);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching levels:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch levels" },
            { status: 500 },
        );
    }
}
