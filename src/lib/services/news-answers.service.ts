import db from "@/lib/db";

import { PLAYER_USERNAME } from "./constants";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface SubmitAnswerInput {
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

// ─── Submit all answers for a news quiz ──────────────────────────────────────

/**
 * Submit all answers for a completed news quiz.
 *
 * Rules:
 * 1. XP is only awarded when all questions are submitted together (quiz completed).
 * 2. If a question was previously answered incorrectly, it earns 0 XP on retry
 *    even if the new answer is correct.
 * 3. Each (player, question) pair is recorded at most once — subsequent calls
 *    are idempotent (upsert).
 */
export async function submitNewsQuizAnswers(
    selectionId: string,
    answers: SubmitAnswerInput[],
): Promise<SubmitQuizResult> {
    const player = await db.players.findUnique({
        where: { username: PLAYER_USERNAME },
    });
    if (!player) throw new Error("Player not found");

    // Fetch all questions for this selection to validate and get correct answers
    const questions = await db.news_questions.findMany({
        where: { selection_id: BigInt(selectionId) },
        orderBy: { question_number: "asc" },
    });

    if (questions.length === 0) {
        throw new Error("No questions found for this selection");
    }

    // Build a lookup map: questionId → question
    const questionMap = new Map(
        questions.map((q) => [Number(q.question_id), q]),
    );

    // Check for any previously recorded answers (to detect prior wrong answers)
    const previousAnswers = await db.player_news_answers.findMany({
        where: {
            player_id: player.player_id,
            question_id: {
                in: questions.map((q) => q.question_id),
            },
        },
    });

    // Set of question_ids that were previously answered incorrectly
    const previouslyWrongIds = new Set(
        previousAnswers
            .filter((a) => !a.is_correct)
            .map((a) => Number(a.question_id)),
    );

    // Set of question_ids already answered (to avoid re-awarding XP)
    const alreadyAnsweredIds = new Set(
        previousAnswers.map((a) => Number(a.question_id)),
    );

    let totalXpEarned = 0;
    const resultAnswers: SubmitQuizResult["answers"] = [];

    for (const answer of answers) {
        const question = questionMap.get(answer.questionId);
        if (!question) continue; // skip unknown questions

        const isCorrect =
            answer.selectedOptionIndex === question.correct_option_index;
        const wasPreviouslyWrong = previouslyWrongIds.has(answer.questionId);
        const wasAlreadyAnswered = alreadyAnsweredIds.has(answer.questionId);

        // XP is awarded only if:
        // - The answer is correct
        // - This question was NOT previously answered incorrectly
        // - This question was NOT already answered (no double-award)
        const xpEarned =
            isCorrect && !wasPreviouslyWrong && !wasAlreadyAnswered
                ? question.xp_reward
                : 0;

        totalXpEarned += xpEarned;

        // Upsert the answer record
        await db.player_news_answers.upsert({
            where: {
                player_id_question_id: {
                    player_id: player.player_id,
                    question_id: BigInt(answer.questionId),
                },
            },
            update: {
                selected_option_index: answer.selectedOptionIndex,
                is_correct: isCorrect,
                xp_earned: xpEarned,
                answered_at: new Date(),
            },
            create: {
                player_id: player.player_id,
                question_id: BigInt(answer.questionId),
                selected_option_index: answer.selectedOptionIndex,
                is_correct: isCorrect,
                xp_earned: xpEarned,
            },
        });

        resultAnswers.push({
            questionId: answer.questionId,
            isCorrect,
            xpEarned,
            wasPreviouslyWrong,
        });
    }

    // Award the total XP to the player
    if (totalXpEarned > 0) {
        await db.players.update({
            where: { player_id: player.player_id },
            data: { xp: { increment: totalXpEarned } },
        });
    }

    return { totalXpEarned, answers: resultAnswers };
}

// ─── Get previously answered questions for a selection ───────────────────────

/**
 * Returns set of question_ids that the player has already answered
 * for the given selection, with their correctness.
 */
export async function getPlayerAnswersForSelection(
    selectionId: string,
): Promise<Map<number, { isCorrect: boolean; xpEarned: number }>> {
    const player = await db.players.findUnique({
        where: { username: PLAYER_USERNAME },
    });
    if (!player) return new Map();

    const questions = await db.news_questions.findMany({
        where: { selection_id: BigInt(selectionId) },
        select: { question_id: true },
    });

    const answers = await db.player_news_answers.findMany({
        where: {
            player_id: player.player_id,
            question_id: { in: questions.map((q) => q.question_id) },
        },
    });

    return new Map(
        answers.map((a) => [
            Number(a.question_id),
            { isCorrect: a.is_correct, xpEarned: a.xp_earned },
        ]),
    );
}
