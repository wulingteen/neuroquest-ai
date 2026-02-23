import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const players = await sql`
            SELECT 
                username as name,
                xp,
                streak_days as streak,
                guild_name as guild,
                avatar
            FROM players
            ORDER BY xp DESC
            LIMIT 100
        `;

        // Add rank
        const leaderboard = players.map((player, index) => ({
            ...player,
            rank: index + 1,
            level: Math.floor(player.xp / 1000) + 1, // 1000 XP per level
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
