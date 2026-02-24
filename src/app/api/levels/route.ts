import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const planetId = searchParams.get('planetId');

        let levelsRaw;
        if (planetId) {
            levelsRaw = await prisma.levels.findMany({
                where: { rollup: planetId },
                orderBy: { level_number: 'asc' }
            });
        } else {
            levelsRaw = await prisma.levels.findMany({
                orderBy: [
                    { rollup: 'asc' },
                    { level_number: 'asc' }
                ]
            });
        }

        const levels = levelsRaw.map((l: any) => ({
            id: l.level_id,
            planetId: l.rollup,
            number: l.level_number,
            title: l.title,
            type: l.content_type,
            xpReward: l.xp_reward
        }));

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
