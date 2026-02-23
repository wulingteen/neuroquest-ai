import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const challenges = await sql`
            SELECT 
                challenge_id as id,
                title,
                description,
                difficulty,
                example_prompts as examples
            FROM arena_challenges
            ORDER BY created_at ASC
        `;

        return NextResponse.json({
            success: true,
            data: challenges,
        });
    } catch (error) {
        console.error('Error fetching arena challenges:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch arena challenges' },
            { status: 500 }
        );
    }
}
