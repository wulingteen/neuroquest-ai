import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const achievementsRaw = await prisma.achievements.findMany({
            orderBy: { xp_reward: 'asc' }
        });

        const achievements = achievementsRaw.map((a) => ({
            id: a.achievement_id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            rarity: a.rarity,
            xpReward: a.xp_reward
        }));

        return NextResponse.json({
            success: true,
            data: achievements,
        });
    } catch (error) {
        console.error('Error fetching achievements:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch achievements' },
            { status: 500 }
        );
    }
}
