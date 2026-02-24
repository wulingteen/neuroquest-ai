import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const challengesRaw = await prisma.arena_challenges.findMany({
            orderBy: { created_at: 'asc' }
        });

        const challenges = challengesRaw.map((c) => ({
            id: c.challenge_id,
            title: c.title,
            description: c.description,
            difficulty: c.difficulty,
            examples: c.example_prompts
        }));

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
