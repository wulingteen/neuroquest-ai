import { NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/user/profile
 *
 * Returns the player's profile (background, interests, difficulty_score).
 * If no profile exists, returns { exists: false }.
 */
export async function GET() {
    try {
        const player = await prisma.players.findUnique({
            where: { username: "YouPlayer" },
            include: { player_profile: true },
        });

        if (!player) {
            return NextResponse.json(
                { success: false, error: "Player not found" },
                { status: 404 }
            );
        }

        if (!player.player_profile) {
            return NextResponse.json({ success: true, exists: false });
        }

        return NextResponse.json({
            success: true,
            exists: true,
            profile: {
                background: player.player_profile.background,
                interests: player.player_profile.interests,
                difficulty_score: player.player_profile.difficulty_score,
                created_at: player.player_profile.created_at,
            },
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch profile" },
            { status: 500 }
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
                { status: 400 }
            );
        }

        const player = await prisma.players.findUnique({
            where: { username: "YouPlayer" },
        });
        if (!player) {
            return NextResponse.json(
                { success: false, error: "Player not found" },
                { status: 404 }
            );
        }

        // Fetch the options from the DB to get their scores
        const allOptions = await prisma.profile_options.findMany();

        // Find background score
        const bgOption = allOptions.find(
            (o) => o.category === "background" && o.option_key === background
        );
        const bgScore = bgOption?.score ?? 50;

        // Find interest scores — average them
        const interestScores = interests
            .map((key) => {
                const opt = allOptions.find(
                    (o) => o.category === "interest" && o.option_key === key
                );
                return opt?.score ?? 50;
            });
        const avgInterestScore =
            interestScores.reduce((a, b) => a + b, 0) / interestScores.length;

        // Final score: weighted blend — 40% background, 60% interests
        const difficultyScore = Math.round(bgScore * 0.4 + avgInterestScore * 0.6);
        const clampedScore = Math.max(0, Math.min(100, difficultyScore));

        // Upsert the profile
        await prisma.player_profiles.upsert({
            where: { player_id: player.player_id },
            update: {
                background,
                interests,
                difficulty_score: clampedScore,
                updated_at: new Date(),
            },
            create: {
                player_id: player.player_id,
                background,
                interests,
                difficulty_score: clampedScore,
            },
        });

        return NextResponse.json({
            success: true,
            difficulty_score: clampedScore,
        });
    } catch (error) {
        console.error("Error saving profile:", error);
        return NextResponse.json(
            { success: false, error: "Failed to save profile" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/user/profile/options
 * Returns all available profile options grouped by category.
 * (Handled by the sibling options/route.ts)
 */
