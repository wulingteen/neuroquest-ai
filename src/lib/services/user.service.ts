import db from "@/lib/db";
import { calculateStreak } from "@/lib/game/helpers";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface PlayerDTO {
    player_id: string;
    playerName: string | null;
    playerAvatar: string | null;
    xp: number;
    streak: number;
    level: number | null;
    lastLogin: Date | null;
    lastRewardClaimed: Date | null;
    showDailyReward: boolean;
    completedLevels: number[];
    unlockedAchievements: string[];
}

export interface ProfileDTO {
    background: string | null;
    interests: string[];
    difficulty_score: number;
    created_at: Date;
}

export interface ProfileOptionDTO {
    key: string;
    label: string | null;
    icon: string | null;
    description: string | null;
    score: number;
}

import { PLAYER_USERNAME } from "./constants";

// ─── Player ──────────────────────────────────────────────────────────────────

export async function getPlayer(): Promise<PlayerDTO | null> {
    const player = await db.players.findUnique({
        where: { username: PLAYER_USERNAME },
    });

    if (!player) return null;

    const { currentStreak, showDailyReward, shouldUpdateLogin } =
        calculateStreak(player);

    if (shouldUpdateLogin) {
        await db.players.update({
            where: { username: PLAYER_USERNAME },
            data: {
                last_login_at: new Date(),
                streak_days: currentStreak,
            },
        });
    }

    const progress = await db.player_progress.findMany({
        where: { player_id: player.player_id },
    });

    return {
        player_id: player.player_id,
        playerName: player.username,
        playerAvatar: player.avatar,
        xp: player.xp,
        streak: currentStreak,
        level: player.level,
        lastLogin: player.last_login_at,
        lastRewardClaimed: player.last_reward_claimed_at,
        showDailyReward,
        completedLevels: progress.map((p) => p.level_id),
        unlockedAchievements: ["first-step"],
    };
}

export async function updatePlayer(body: {
    xp?: number;
    claimReward?: boolean;
    completedLevelId?: number;
}): Promise<void> {
    const player = await db.players.findUnique({
        where: { username: PLAYER_USERNAME },
    });
    if (!player) throw new Error("Player not found");

    const { xp, claimReward, completedLevelId } = body;

    if (xp !== undefined) {
        await db.players.update({
            where: { username: PLAYER_USERNAME },
            data: { xp },
        });
    }

    if (claimReward) {
        await db.players.update({
            where: { username: PLAYER_USERNAME },
            data: { last_reward_claimed_at: new Date() },
        });
    }

    if (completedLevelId) {
        const levelIdInt = Number(completedLevelId);
        const existingProgress = await db.player_progress.findFirst({
            where: { player_id: player.player_id, level_id: levelIdInt },
        });
        if (!existingProgress) {
            await db.player_progress.create({
                data: { player_id: player.player_id, level_id: levelIdInt },
            });
        }
    }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<{
    exists: boolean;
    profile?: ProfileDTO;
} | null> {
    const player = await db.players.findUnique({
        where: { username: PLAYER_USERNAME },
        include: { player_profile: true },
    });

    if (!player) return null;

    if (!player.player_profile) {
        return { exists: false };
    }

    return {
        exists: true,
        profile: {
            background: player.player_profile.background,
            interests: player.player_profile.interests,
            difficulty_score: player.player_profile.difficulty_score,
            created_at: player.player_profile.created_at,
        },
    };
}

export async function upsertProfile(body: {
    background: string;
    interests: string[];
}): Promise<number> {
    const { background, interests } = body;

    const player = await db.players.findUnique({
        where: { username: PLAYER_USERNAME },
    });
    if (!player) throw new Error("Player not found");

    // Fetch the options from the DB to get their scores
    const allOptions = await db.profile_options.findMany();

    // Find background score
    const bgOption = allOptions.find(
        (o) => o.category === "background" && o.option_key === background,
    );
    const bgScore = bgOption?.score ?? 50;

    // Find interest scores — average them
    const interestScores = interests.map((key) => {
        const opt = allOptions.find(
            (o) => o.category === "interest" && o.option_key === key,
        );
        return opt?.score ?? 50;
    });
    const avgInterestScore =
        interestScores.reduce((a, b) => a + b, 0) / interestScores.length;

    // Final score: weighted blend — 40% background, 60% interests
    const difficultyScore = Math.round(bgScore * 0.4 + avgInterestScore * 0.6);
    const clampedScore = Math.max(0, Math.min(100, difficultyScore));

    // Upsert the profile
    await db.player_profiles.upsert({
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

    return clampedScore;
}

// ─── Profile Options ─────────────────────────────────────────────────────────

export async function getProfileOptions(): Promise<{
    backgrounds: ProfileOptionDTO[];
    interests: ProfileOptionDTO[];
}> {
    const options = await db.profile_options.findMany({
        orderBy: [{ category: "asc" }, { sort_order: "asc" }],
    });

    const mapOption = (o: (typeof options)[number]): ProfileOptionDTO => ({
        key: o.option_key,
        label: o.label,
        icon: o.icon,
        description: o.description,
        score: o.score,
    });

    return {
        backgrounds: options
            .filter((o) => o.category === "background")
            .map(mapOption),
        interests: options.filter((o) => o.category === "interest").map(mapOption),
    };
}
