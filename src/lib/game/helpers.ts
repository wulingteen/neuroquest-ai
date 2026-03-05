// Game & Player domain helpers
// Merged from gameData.ts + playerUtils.ts

import { Planet, Level, Achievement, QuizQuestion, LeaderboardEntry } from "@/types/game";

export type { Planet, Level, Achievement, QuizQuestion, LeaderboardEntry };


// ── XP / Level helpers ──────────────────────────────────────────────

export function getXPForLevel(level: number): number {
    return level * 1000;
}

export function getLevelFromXP(xp: number): number {
    return Math.floor(xp / 1000) + 1;
}

export function getLevelProgress(xp: number): number {
    const currentLevelXP = Math.floor(xp / 1000) * 1000;
    return ((xp - currentLevelXP) / 1000) * 100;
}

export const LEVEL_TITLES = [
    "AI 新人", "初級研究員", "助理工程師", "工程師",
    "高級工程師", "技術主管", "AI 架構師", "首席科學家",
    "AI 先驅者", "傳說中的探索者",
];

export function getLevelTitle(level: number): string {
    const index = Math.min(Math.floor((level - 1) / 5), LEVEL_TITLES.length - 1);
    return LEVEL_TITLES[index];
}


// ── Difficulty Score → Tier helpers ─────────────────────────────────

/** Convert a difficulty_score (0-100) to a news difficulty tier (1-5). */
export function scoreToTier(score: number): number {
    if (score <= 20) return 1;
    if (score <= 40) return 2;
    if (score <= 60) return 3;
    if (score <= 80) return 4;
    return 5;
}

// ── Streak / Daily Reward helpers ───────────────────────────────────

/**
 * Calculates the updated streak and whether to show a daily reward.
 */
export function calculateStreak(player: {
    last_login_at: Date | null;
    last_reward_claimed_at: Date | null;
    streak_days: number;
}) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let currentStreak = player.streak_days;
    let showDailyReward = false;
    let shouldUpdateLogin = false;

    if (!player.last_login_at) {
        currentStreak = 1;
        showDailyReward = true;
        shouldUpdateLogin = true;
    } else {
        const lastLoginDay = new Date(
            player.last_login_at.getFullYear(),
            player.last_login_at.getMonth(),
            player.last_login_at.getDate()
        );
        const diffDays = Math.floor((today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak += 1;
            showDailyReward = true;
            shouldUpdateLogin = true;
        } else if (diffDays > 1) {
            currentStreak = 1;
            showDailyReward = true;
            shouldUpdateLogin = true;
        } else if (diffDays === 0) {
            // Already logged in today, check if reward was claimed today
            if (!player.last_reward_claimed_at) {
                showDailyReward = true;
            } else {
                const lastClaimDay = new Date(
                    player.last_reward_claimed_at.getFullYear(),
                    player.last_reward_claimed_at.getMonth(),
                    player.last_reward_claimed_at.getDate()
                );
                if (lastClaimDay.getTime() < today.getTime()) {
                    showDailyReward = true;
                }
            }
        }
    }

    return { currentStreak, showDailyReward, shouldUpdateLogin };
}
