import db from "@/lib/db";
import { openai, EXAMINER_MODEL } from "./constants";
import { EXAMINER_PROMPT } from "./prompts";
import { parseLLMJson, retryAsync } from "./utils";
import { fetchFullText } from "./scraper";
import type { RankedArticle } from "./ranker";

interface ParsedQuestion {
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string;
}

/** Validate that a parsed question has the expected shape. */
function isValidQuestion(q: unknown): q is ParsedQuestion {
    if (typeof q !== "object" || q === null) return false;
    const obj = q as Record<string, unknown>;
    return (
        typeof obj.question_text === "string" &&
        obj.question_text.length > 0 &&
        Array.isArray(obj.options) &&
        obj.options.length === 4 &&
        obj.options.every((o: unknown) => typeof o === "string") &&
        typeof obj.correct_option_index === "number" &&
        Number.isInteger(obj.correct_option_index) &&
        obj.correct_option_index >= 0 &&
        obj.correct_option_index <= 3 &&
        typeof obj.explanation === "string"
    );
}

export interface ExaminerStats {
    processed: number;
    failed: number;
}

/** Process a single article: fetch full text, call LLM, save questions. Returns true on success. */
async function processOneArticle(sel: RankedArticle, cycleDate: Date): Promise<boolean> {
    const article = await db.news_articles.findUnique({
        where: { article_id: sel.articleId },
    });
    if (!article) return false;

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

    // Check for existing selection to prevent duplicates from parallel/retry runs
    const existingSelection = await db.news_selections.findFirst({
        where: { article_id: article.article_id, cycle_date: cycleDate },
    });
    if (existingSelection) {
        console.log(`Selection already exists for article ${article.article_id} on ${cycleDate.toISOString()}, skipping`);
        return true;
    }

    const selectionObj = await db.news_selections.create({
        data: {
            article_id: article.article_id,
            tier: sel.tier,
            cycle_date: cycleDate,
        },
    });

    try {
        const questionResponse = await retryAsync(() =>
            openai.chat.completions.create({
                model: EXAMINER_MODEL,
                messages: [{ role: "user", content: EXAMINER_PROMPT(article.title, textForLLM.substring(0, 10000)) }],
            })
        );

        const qContent = questionResponse.choices[0].message.content || "[]";
        let questionsParsed: unknown[];

        try {
            questionsParsed = parseLLMJson(qContent);
        } catch {
            console.warn(`Failed to parse questions for article ${article.article_id}`);
            await db.news_selections.delete({ where: { selection_id: selectionObj.selection_id } });
            return false;
        }

        let qNum = 0;
        for (const raw of questionsParsed) {
            if (qNum >= 3) break;
            if (!isValidQuestion(raw)) {
                console.warn(`Invalid question structure for article ${article.article_id}, skipping`);
                continue;
            }
            qNum++;
            await db.news_questions.create({
                data: {
                    selection_id: selectionObj.selection_id,
                    question_number: qNum,
                    question_text: raw.question_text,
                    options: raw.options,
                    correct_option_index: raw.correct_option_index,
                    explanation: raw.explanation,
                    xp_reward: sel.tier * 10,
                },
            });
        }

        // Clean up orphaned selection if no valid questions were saved
        if (qNum === 0) {
            await db.news_selections.delete({ where: { selection_id: selectionObj.selection_id } });
            return false;
        }

        return true;
    } catch (e) {
        // Clean up the selection if anything fails after creation
        await db.news_selections.delete({ where: { selection_id: selectionObj.selection_id } }).catch(() => {});
        throw e;
    }
}

const EXAMINER_BATCH_SIZE = 5;

/** For each selected article, fetch full text, generate questions, and persist to DB. */
export async function generateAndSaveQuestions(
    selectedArticles: RankedArticle[],
    cycleDate: Date
): Promise<ExaminerStats> {
    if (selectedArticles.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < selectedArticles.length; i += EXAMINER_BATCH_SIZE) {
        const batch = selectedArticles.slice(i, i + EXAMINER_BATCH_SIZE);
        const results = await Promise.allSettled(
            batch.map((sel) => processOneArticle(sel, cycleDate))
        );

        for (const r of results) {
            if (r.status === "fulfilled" && r.value) processed++;
            else failed++;
        }
    }

    console.log(`Examiner: ${processed} processed, ${failed} failed out of ${selectedArticles.length}`);
    return { processed, failed };
}
