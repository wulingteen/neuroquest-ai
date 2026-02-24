import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const levelId = searchParams.get('levelId');

        let questions;
        if (levelId) {
            questions = await sql`
                SELECT 
                    question_id as id,
                    question_number as number,
                    question_text as question,
                    options,
                    correct_option_index as correct,
                    explanation,
                    xp_reward as xp
                FROM quiz_questions
                WHERE level_id = ${levelId}
                ORDER BY question_number ASC
                LIMIT 5
            `;
        } else {
            questions = await sql`
                SELECT 
                    question_id as id,
                    question_number as number,
                    question_text as question,
                    options,
                    correct_option_index as correct,
                    explanation,
                    xp_reward as xp
                FROM quiz_questions
                ORDER BY RANDOM()
                LIMIT 5
            `;
        }

        return NextResponse.json({
            success: true,
            data: questions,
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch quiz' },
            { status: 500 }
        );
    }
}
