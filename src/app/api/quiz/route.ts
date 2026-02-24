import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const levelId = searchParams.get('levelId');

        if (levelId) {
            const questionsRaw = await prisma.quiz_questions.findMany({
                where: { level_id: parseInt(levelId, 10) },
                orderBy: { question_number: 'asc' },
                take: 5
            });

            const questions = questionsRaw.map((q: any) => ({
                id: q.question_id,
                number: q.question_number,
                question: q.question_text,
                options: q.options,
                correct: q.correct_option_index,
                explanation: q.explanation,
                xp: q.xp_reward
            }));

            return NextResponse.json({
                success: true,
                data: questions,
            });
        } else {
            const randomQuestions = await prisma.$queryRaw<any[]>`
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

            return NextResponse.json({
                success: true,
                data: randomQuestions,
            });
        }
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch quiz' },
            { status: 500 }
        );
    }
}
