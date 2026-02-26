// Utility for player related logic

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
