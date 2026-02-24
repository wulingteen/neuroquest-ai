import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const planets = await prisma.planets.findMany({
            include: {
                _count: {
                    select: { levels: true }
                }
            },
            orderBy: { created_at: 'asc' }
        });

        const formattedPlanets = planets.map((p) => ({
            id: p.rollup,
            name: p.label,
            subtitle: p.subtitle,
            icon: p.icon,
            color: p.color,
            glowColor: p.glow_color,
            bgGradient: p.bg_gradient,
            x: p.x,
            y: p.y,
            totalLevels: p._count.levels,
            description: p.description,
            requiredPlanet: p.required_rollup
        }));

        return NextResponse.json({
            success: true,
            data: formattedPlanets,
        });
    } catch (error) {
        console.error('Error fetching planets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch planets' },
            { status: 500 }
        );
    }
}
