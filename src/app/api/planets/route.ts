import { NextResponse } from "next/server";
import { getAllPlanets } from "@/lib/services/planet.service";

export async function GET() {
    try {
        const data = await getAllPlanets();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching planets:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch planets" },
            { status: 500 },
        );
    }
}
