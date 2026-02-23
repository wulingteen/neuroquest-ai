import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const achievements = await sql`
            SELECT 
                achievement_id as id,
                name,
                description,
                icon,
                rarity,
                xp_reward as "xpReward"
            FROM achievements
            ORDER BY xp_reward ASC
        `;

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
