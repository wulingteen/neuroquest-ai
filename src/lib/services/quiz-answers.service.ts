import db from "@/lib/db";
import { PLAYER_USERNAME } from "./constants";

export interface SubmitQuizAnswerInput {
    questionId: number;
    selectedOptionIndex: number;
}

export interface SubmitQuizResult {
    totalXpEarned: number;
    answers: {
        questionId: number;
        isCorrect: boolean;
        xpEarned: number;
        wasPreviouslyWrong: boolean;
    }[];
}

/**
 * Submit all answers for a completed level quiz.
 */
export async function submitQuizAnswers(
    levelId: string | number,
    answers: SubmitQuizAnswerInput[],
): Promise<SubmitQuizResult> {
    const player = await db.players.findUnique({
        where: { username: PLAYER_USERNAME },
    });
    if (!player) throw new Error("Player not found");

    // Fetch questions to validate
    const quizQuestions = await db.quiz_questions.findMany({
        where: {
            question_id: { in: answers.map((a) => a.questionId) }
        }
    });

    const questionMap = new Map(quizQuestions.map((q) => [q.question_id, q]));

    // Check previously recorded answers
    const previousAnswers = await db.player_quiz_answers.findMany({
        where: {
            player_id: player.player_id,
            question_id: { in: quizQuestions.map((q) => q.question_id) }
        }
    });

    const previouslyWrongIds = new Set(
        previousAnswers.filter((a) => !a.is_correct).map((a) => a.question_id)
    );
    const alreadyAnsweredIds = new Set(previousAnswers.map((a) => a.question_id));

    let totalXpEarned = 0;
    const resultAnswers: SubmitQuizResult["answers"] = [];

    for (const answer of answers) {
        const question = questionMap.get(answer.questionId);
        if (!question) continue;

        const isCorrect = answer.selectedOptionIndex === question.correct_option_index;
        const wasPreviouslyWrong = previouslyWrongIds.has(answer.questionId);
        const wasAlreadyAnswered = alreadyAnsweredIds.has(answer.questionId);

        // XP is awarded only if:
        // - Answer is correct
        // - NOT previously wrong (on parity with news system)
        // - NOT already answered (idempotency)
        const xpEarned = isCorrect && !wasPreviouslyWrong && !wasAlreadyAnswered
            ? question.xp_reward
            : 0;

        totalXpEarned += xpEarned;

        await db.player_quiz_answers.upsert({
            where: {
                player_id_question_id: {
                    player_id: player.player_id,
                    question_id: answer.questionId,
                }
            },
            update: {
                selected_option_index: answer.selectedOptionIndex,
                is_correct: isCorrect,
                xp_earned: xpEarned,
                answered_at: new Date(),
            },
            create: {
                player_id: player.player_id,
                question_id: answer.questionId,
                selected_option_index: answer.selectedOptionIndex,
                is_correct: isCorrect,
                xp_earned: xpEarned,
            }
        });

        resultAnswers.push({
            questionId: answer.questionId,
            isCorrect,
            xpEarned,
            wasPreviouslyWrong
        });
    }

    // Award XP
    if (totalXpEarned > 0) {
        await db.players.update({
            where: { player_id: player.player_id },
            data: { xp: { increment: totalXpEarned } }
        });
    }

    return { totalXpEarned, answers: resultAnswers };
}
