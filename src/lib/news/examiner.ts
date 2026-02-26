import db from "@/lib/db";
import { openai, EXAMINER_MODEL } from "./constants";
import { parseLLMJson } from "./utils";
import { fetchFullText } from "./scraper";
import type { RankedArticle } from "./ranker";

/** For each selected article, fetch full text, generate questions, and persist to DB. */
export async function generateAndSaveQuestions(
    selectedArticles: RankedArticle[],
    cycleDate: Date
) {
    for (const sel of selectedArticles) {
        const article = await db.news_articles.findUnique({
            where: { article_id: sel.articleId },
        });
        if (!article) continue;

        // Fetch full text if missing
        let fullText = article.full_text;
        if (!fullText) {
            const scraped = await fetchFullText(article.url);
            if (scraped) {
                fullText = scraped;
                await db.news_articles.update({
                    where: { article_id: article.article_id },
                    data: { full_text: fullText },
                });
            }
        }

        const textForLLM = fullText || article.summary || article.title;

        try {
            const selectionObj = await db.news_selections.create({
                data: {
                    article_id: article.article_id,
                    tier: sel.tier,
                    cycle_date: cycleDate,
                },
            });

            const examinerPrompt = `You are an expert reading comprehension teacher. Based on the following article, create exactly 3 multiple-choice questions.
Each question must have exactly 4 options and test different aspects of comprehension (main idea, detail, inference).

Return ONLY a valid JSON array in exactly this format, with no other text or markdown:
[
  {
    "question_text": "text of the question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "Explanation for why the answer is correct"
  }
]

Rules:
- "correct_option_index" must be an integer from 0 to 3 corresponding to the correct option.
- Provide exactly 3 question objects in the array.

Article Title: ${article.title}
Article Content:
${textForLLM.substring(0, 10000)}`;

            const questionResponse = await openai.chat.completions.create({
                model: EXAMINER_MODEL,
                messages: [{ role: "user", content: examinerPrompt }],
            });

            const qContent = questionResponse.choices[0].message.content || "[]";
            let questionsParsed: Array<{
                question_text: string;
                options: string[];
                correct_option_index: number;
                explanation: string;
            }>;

            try {
                questionsParsed = parseLLMJson(qContent);
            } catch {
                console.warn("Failed to parse questions for article", article.article_id.toString());
                continue;
            }

            let qNum = 1;
            for (const q of questionsParsed) {
                if (qNum > 3) break;
                await db.news_questions.create({
                    data: {
                        selection_id: selectionObj.selection_id,
                        question_number: qNum++,
                        question_text: q.question_text,
                        options: q.options,
                        correct_option_index: q.correct_option_index,
                        explanation: q.explanation,
                        xp_reward: sel.tier * 10,
                    },
                });
            }
        } catch (e) {
            const selErrMsg = e instanceof Error ? e.message : String(e);
            console.warn(
                `Error processing article "${sel.title}" (tier ${sel.tier}):`,
                selErrMsg
            );
        }
    }
}
