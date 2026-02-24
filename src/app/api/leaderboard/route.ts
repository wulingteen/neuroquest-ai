import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const players = await sql`
            SELECT 
                username as name,
                xp,
                level,
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
