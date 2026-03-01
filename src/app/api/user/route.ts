import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateStreak } from '@/lib/game/helpers';

export async function GET() {
    try {
        const player = await prisma.players.findUnique({
            where: { username: 'YouPlayer' }
        });

        if (!player) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const { currentStreak, showDailyReward, shouldUpdateLogin } = calculateStreak(player);

        if (shouldUpdateLogin) {
            await prisma.players.update({
                where: { username: 'YouPlayer' },
                data: {
                    last_login_at: new Date(),
                    streak_days: currentStreak
                }
            });
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
