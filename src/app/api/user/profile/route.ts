import { NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/lib/services/user.service";

/**
 * GET /api/user/profile
 *
 * Returns the player's profile (background, interests, difficulty_score).
 * If no profile exists, returns { exists: false }.
 */
export async function GET() {
    try {
        const result = await getProfile();

        if (result === null) {
            return NextResponse.json(
                { success: false, error: "Player not found" },
                { status: 404 },
            );
        }

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("Error fetching profile:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch profile" },
            { status: 500 },
        );
    }
}

/**
 * POST /api/user/profile
 *
 * Creates or updates the player's profile.
 * Body: { background: string, interests: string[] }
 *
 * The difficulty_score (0-100) is computed server-side from
 * the profile_options table scores.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { background, interests } = body as {
            background: string;
            interests: string[];
        };

        if (!background || !Array.isArray(interests) || interests.length === 0) {
            return NextResponse.json(
                { success: false, error: "background and interests[] are required" },
                { status: 400 },
            );
        }

        const difficultyScore = await upsertProfile({ background, interests });

        return NextResponse.json({
            success: true,
            difficulty_score: difficultyScore,
        });
    } catch (error) {
        console.error("Error saving profile:", error);
        return NextResponse.json(
            { success: false, error: "Failed to save profile" },
            { status: 500 },
        );
    }
}
