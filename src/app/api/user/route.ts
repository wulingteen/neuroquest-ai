import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        // Fetch player data
        const players = await sql`
            SELECT 
                player_id,
                username as "playerName",
                avatar as "playerAvatar",
                xp,
                streak_days as streak,
                level,
                last_login_at as "lastLogin",
                last_reward_claimed_at as "lastRewardClaimed"
            FROM players
            WHERE username = 'YouPlayer'
            LIMIT 1
        `;

        if (players.length === 0) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const player = players[0];
        const now = new Date();
        const lastLoginAt = player.lastLogin ? new Date(player.lastLogin) : null;
        const lastClaimedAt = player.lastRewardClaimed ? new Date(player.lastRewardClaimed) : null;

        let currentStreak = player.streak;
        let showDailyReward = false;

        // Logic to determine streak and whether to show reward
        if (!lastLoginAt) {
            // First time login
            currentStreak = 1;
            showDailyReward = true;
            await sql`
                UPDATE players SET last_login_at = ${now}, streak_days = 1 WHERE username = 'YouPlayer'
            `;
        } else {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastLoginDay = new Date(lastLoginAt.getFullYear(), lastLoginAt.getMonth(), lastLoginAt.getDate());
            const diffDays = Math.floor((today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // New day, consecutive
                currentStreak += 1;
                showDailyReward = true;
                await sql`
                    UPDATE players SET last_login_at = ${now}, streak_days = ${currentStreak} WHERE username = 'YouPlayer'
                `;
            } else if (diffDays > 1) {
                // New day, streak broken
                currentStreak = 1;
                showDailyReward = true;
                await sql`
                    UPDATE players SET last_login_at = ${now}, streak_days = 1 WHERE username = 'YouPlayer'
                `;
            } else if (diffDays === 0) {
                // Same day, check if reward already claimed today
                if (!lastClaimedAt) {
                    showDailyReward = true;
                } else {
                    const lastClaimDay = new Date(lastClaimedAt.getFullYear(), lastClaimedAt.getMonth(), lastClaimedAt.getDate());
                    if (lastClaimDay.getTime() < today.getTime()) {
                        showDailyReward = true;
                    }
                }
            }
        }

        // Fetch completed levels
        const progress = await sql`
            SELECT level_id
            FROM player_progress
            WHERE player_id = ${player.player_id}
        `;

        const completedLevels = progress.map(p => p.level_id);

        return NextResponse.json({
            success: true,
            data: {
                ...player,
                streak: currentStreak,
                showDailyReward,
                completedLevels,
                unlockedAchievements: ["first-step"],
            },
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user profile' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { xp, claimReward, completedLevelId } = body;

        // Update basic player stats
        if (xp !== undefined) {
            await sql`
                UPDATE players
                SET xp = ${xp}
                WHERE username = 'YouPlayer'
            `;
        }

        // Handle reward claim
        if (claimReward) {
            await sql`
                UPDATE players
                SET last_reward_claimed_at = NOW()
                WHERE username = 'YouPlayer'
            `;
        }

        // Add progress if a level was completed
        if (completedLevelId) {
            await sql`
                INSERT INTO player_progress (player_id, level_id)
                VALUES (
                    (SELECT player_id FROM players WHERE username = 'YouPlayer'),
                    ${completedLevelId}
                )
                ON CONFLICT (player_id, level_id) DO NOTHING
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update user profile' },
            { status: 500 }
        );
    }
}
