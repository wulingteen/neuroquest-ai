import { NextResponse } from "next/server";
import { getQuizQuestions } from "@/lib/services/quiz.service";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const levelNumberParam = searchParams.get("levelNumber");
        const rollup = searchParams.get("rollup") ?? undefined;

        const data = await getQuizQuestions({
            levelNumber: levelNumberParam
                ? parseInt(levelNumberParam, 10)
                : undefined,
            rollup,
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching quiz:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch quiz" },
            { status: 500 },
        );
    }
}
