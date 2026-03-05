import { NextResponse } from "next/server";
import { submitNewsQuizAnswers } from "@/lib/services/news-answers.service";

/**
 * POST /api/news/answers
 *
 * Submit all answers for a completed news quiz.
 * XP is only awarded in bulk after the full quiz is completed.
 * Previously-wrong questions earn 0 XP even if answered correctly on retry.
 *
 * Body:
 *   selectionId — the news selection (article) ID
 *   answers     — array of { questionId, selectedOptionIndex }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { selectionId, answers } = body;

        if (!selectionId || !Array.isArray(answers) || answers.length === 0) {
            return NextResponse.json(
                { error: "selectionId and non-empty answers[] are required" },
                { status: 400 },
            );
        }

        const result = await submitNewsQuizAnswers(selectionId, answers);

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
