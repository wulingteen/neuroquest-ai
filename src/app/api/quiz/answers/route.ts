import { NextResponse } from "next/server";
import { submitQuizAnswers } from "@/lib/services/quiz-answers.service";

/**
 * POST /api/quiz/answers
 * Body: { levelId: number|string, answers: [{ questionId: number, selectedOptionIndex: number }] }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { levelId, answers } = body;

        if (!levelId || !Array.isArray(answers)) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 },
            );
        }

        const data = await submitQuizAnswers(levelId, answers);

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("Error submitting quiz answers:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 },
        );
    }
}
