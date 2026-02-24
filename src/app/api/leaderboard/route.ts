import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const playersRaw = await prisma.players.findMany({
            orderBy: { xp: 'desc' },
            take: 100
        });

        const leaderboard = playersRaw.map((player, index) => ({
            name: player.username,
            xp: player.xp,
            level: player.level,
            streak: player.streak_days,
            guild: player.guild_name,
            avatar: player.avatar,
            rank: index + 1,
        }));

        return NextResponse.json({
            success: true,
            data: leaderboard,
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}
