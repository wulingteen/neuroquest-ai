import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const player = await prisma.players.findUnique({
            where: { username: 'YouPlayer' }
        });

        if (!player) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const now = new Date();
        const lastLoginAt = player.last_login_at;
        const lastClaimedAt = player.last_reward_claimed_at;

        let currentStreak = player.streak_days;
        let showDailyReward = false;

        if (!lastLoginAt) {
            currentStreak = 1;
            showDailyReward = true;
            await prisma.players.update({
                where: { username: 'YouPlayer' },
                data: { last_login_at: now, streak_days: 1 }
            });
        } else {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastLoginDay = new Date(lastLoginAt.getFullYear(), lastLoginAt.getMonth(), lastLoginAt.getDate());
            const diffDays = Math.floor((today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak += 1;
                showDailyReward = true;
                await prisma.players.update({
                    where: { username: 'YouPlayer' },
                    data: { last_login_at: now, streak_days: currentStreak }
                });
            } else if (diffDays > 1) {
                currentStreak = 1;
                showDailyReward = true;
                await prisma.players.update({
                    where: { username: 'YouPlayer' },
                    data: { last_login_at: now, streak_days: 1 }
                });
            } else if (diffDays === 0) {
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

        const progress = await prisma.player_progress.findMany({
            where: { player_id: player.player_id }
        });

        const completedLevels = progress.map((p) => p.level_id);

        return NextResponse.json({
            success: true,
            data: {
                player_id: player.player_id,
                playerName: player.username,
                playerAvatar: player.avatar,
                xp: player.xp,
                streak: currentStreak,
                level: player.level,
                lastLogin: player.last_login_at,
                lastRewardClaimed: player.last_reward_claimed_at,
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

        const player = await prisma.players.findUnique({ where: { username: 'YouPlayer' } });
        if (!player) throw new Error('Player not found');

        if (xp !== undefined) {
            await prisma.players.update({
                where: { username: 'YouPlayer' },
                data: { xp: xp }
            });
        }

        if (claimReward) {
            await prisma.players.update({
                where: { username: 'YouPlayer' },
                data: { last_reward_claimed_at: new Date() }
            });
        }

        if (completedLevelId) {
            const levelIdInt = Number(completedLevelId);
            const existingProgress = await prisma.player_progress.findFirst({
                where: { player_id: player.player_id, level_id: levelIdInt }
            });
            if (!existingProgress) {
                await prisma.player_progress.create({
                    data: { player_id: player.player_id, level_id: levelIdInt }
                });
            }
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
