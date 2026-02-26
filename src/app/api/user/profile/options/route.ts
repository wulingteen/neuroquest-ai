import { NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/user/profile/options
 *
 * Returns all profile options grouped by category.
 * Used by the ProfileSetupModal to render the selection UI.
 */
export async function GET() {
    try {
        const options = await prisma.profile_options.findMany({
            orderBy: [{ category: "asc" }, { sort_order: "asc" }],
        });

        // Group by category
        const backgrounds = options
            .filter((o) => o.category === "background")
            .map((o) => ({
                key: o.option_key,
                label: o.label,
                icon: o.icon,
                description: o.description,
                score: o.score,
            }));

        const interests = options
            .filter((o) => o.category === "interest")
            .map((o) => ({
                key: o.option_key,
                label: o.label,
                icon: o.icon,
                description: o.description,
                score: o.score,
            }));

        return NextResponse.json({
            success: true,
            backgrounds,
            interests,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching profile options:", error);
        return NextResponse.json(
            { success: false, error: `Failed to fetch profile options: ${msg}` },
            { status: 500 }
        );
    }
}
