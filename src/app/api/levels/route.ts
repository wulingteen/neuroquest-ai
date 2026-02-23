import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const planetId = searchParams.get('planetId');

        let levels;
        if (planetId) {
            levels = await sql`
                SELECT 
                    level_id as id,
                    planet_id as "planetId",
                    level_number as number,
                    title,
                    content_type as type,
                    xp_reward as "xpReward"
                FROM levels
                WHERE planet_id = ${planetId}
                ORDER BY level_number ASC
            `;
        } else {
            levels = await sql`
                SELECT 
                    level_id as id,
                    planet_id as "planetId",
                    level_number as number,
                    title,
                    content_type as type,
                    xp_reward as "xpReward"
                FROM levels
                ORDER BY planet_id, level_number ASC
            `;
        }

        return NextResponse.json({
            success: true,
            data: levels,
        });
    } catch (error) {
        console.error('Error fetching levels:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch levels' },
            { status: 500 }
        );
    }
}
