import db from "@/lib/db";

export interface QuizQuestionDTO {
    id: number;
    number: number;
    question: string | null;
    options: unknown;
    correct: number | null;
    explanation: string | null;
    xp: number;
}

/**
 * Fetch quiz questions by level number and/or rollup.
 * If neither is provided, returns 5 random questions.
 */
export async function getQuizQuestions(params: {
    levelNumber?: number;
    rollup?: string;
}): Promise<QuizQuestionDTO[]> {
    const { levelNumber, rollup } = params;

    if (levelNumber !== undefined || rollup !== undefined) {
        const whereClause: { level_number?: number; rollup?: string } = {};
        if (levelNumber !== undefined) whereClause.level_number = levelNumber;
        if (rollup !== undefined) whereClause.rollup = rollup;

        const raw = await db.quiz_questions.findMany({
            where: whereClause,
            orderBy: { question_number: "asc" },
            take: 5,
        });

        return raw.map((q) => ({
            id: q.question_id,
            number: q.question_number,
            question: q.question_text,
            options: q.options,
            correct: q.correct_option_index,
            explanation: q.explanation,
            xp: q.xp_reward,
        }));
    }

    // Random questions fallback
    const randomQuestions = await db.$queryRaw<
        {
            id: number;
            number: number;
            question: string;
            options: unknown;
            correct: number;
            explanation: string;
            xp: number;
        }[]
    >`
    SELECT
      question_id   AS id,
      question_number AS number,
      question_text AS question,
      options,
      correct_option_index AS correct,
      explanation,
      xp_reward     AS xp
    FROM quiz_questions
    ORDER BY RANDOM()
    LIMIT 5
  `;

    return randomQuestions;
}
