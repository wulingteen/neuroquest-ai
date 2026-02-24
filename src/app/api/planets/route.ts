import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const planets = await sql`
            SELECT 
                p.planet_id as id,
                p.name,
                p.subtitle,
                p.icon,
                p.color,
                p.glow_color as "glowColor",
                p.bg_gradient as "bgGradient",
                p.x,
                p.y,
                (SELECT COUNT(*)::int FROM levels l WHERE l.planet_id = p.planet_id) as "totalLevels",
                p.description,
                p.locked,
                p.required_planet_id as "requiredPlanet"
            FROM planets p
            ORDER BY p.created_at ASC
        `;

        return NextResponse.json({
            success: true,
            data: planets,
        });
    } catch (error) {
        console.error('Error fetching planets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch planets' },
            { status: 500 }
        );
    }
}
