import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const planets = await sql`
            SELECT 
                planet_id as id,
                name,
                subtitle,
                icon,
                color,
                glow_color as "glowColor",
                bg_gradient as "bgGradient",
                x,
                y,
                total_levels as "totalLevels",
                description,
                locked,
                required_planet_id as "requiredPlanet"
            FROM planets
            ORDER BY created_at ASC
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
