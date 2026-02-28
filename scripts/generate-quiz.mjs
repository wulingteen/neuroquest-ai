#!/usr/bin/env node
/**
 * CLI script to generate quiz questions for a specific planet.
 *
 * Usage:
 *   node scripts/generate-quiz.mjs --rollup prompt --count 5
 *   node scripts/generate-quiz.mjs -r model -c 3
 *   node scripts/generate-quiz.mjs -r prompt -c 5 --same-difficulty
 *   node scripts/generate-quiz.mjs -r future -c 3 --level-count 4
 *   node scripts/generate-quiz.mjs -r rag -c 5   # new rollup → prompts for overview
 *
 * Requires:
 *   - The dev server to be running (it hits localhost:3000/api/quiz/generate)
 *   - OPENROUTER_API_KEY to be set in the dev server's environment
 */

import { parseArgs } from "node:util";
import { createInterface } from "node:readline";

const { values } = parseArgs({
    options: {
        rollup: { type: "string", short: "r" },
        count: { type: "string", short: "c", default: "5" },
        host: { type: "string", short: "h", default: "http://localhost:3000" },
        "same-difficulty": { type: "boolean", short: "s", default: false },
        "level-count": { type: "string", short: "l" },
    },
});

const rollup = values.rollup;
const count = parseInt(values.count, 10);
const host = values.host;
const sameDifficulty = values["same-difficulty"] === true;
const levelCountRaw = values["level-count"];
const levelCount = levelCountRaw ? parseInt(levelCountRaw, 10) : undefined;

if (!rollup) {
    console.error("❌ Missing --rollup flag. Example: --rollup prompt");
    process.exit(1);
}

if (rollup.length > 50) {
    console.error("❌ --rollup must be 50 characters or fewer.");
    process.exit(1);
}

if (isNaN(count) || count < 1 || count > 20) {
    console.error("❌ --count must be an integer between 1 and 20.");
    process.exit(1);
}

if (levelCount !== undefined && (isNaN(levelCount) || levelCount < 1 || levelCount > 10)) {
    console.error("❌ --level-count must be an integer between 1 and 10.");
    process.exit(1);
}

if (levelCount !== undefined && levelCount > 1 && sameDifficulty) {
    console.error("❌ --same-difficulty and --level-count > 1 cannot be used together.");
    console.error("   --level-count already organises questions into difficulty tiers.");
    process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Prompt the user for multi-line input via stdin.
 * Ends when the user enters a blank line or presses Ctrl+D.
 */
function promptForOverview(rollupName) {
    return new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        console.log(`\n🆕 Rollup "${rollupName}" is not registered in the system.`);
        console.log(`   Please provide a topic overview so the LLM can generate questions.`);
        console.log(`   (Type your overview, then press Enter twice or Ctrl+D to submit)\n`);
        process.stdout.write("📝 Overview: ");

        const lines = [];
        rl.on("line", (line) => {
            if (line.trim() === "" && lines.length > 0) {
                rl.close();
            } else {
                lines.push(line);
                process.stdout.write("   ... ");
            }
        });
        rl.on("close", () => {
            const overview = lines.join("\n").trim();
            resolve(overview);
        });
    });
}

// ─── Main ────────────────────────────────────────────────────────────────────

const totalQuestions = levelCount && levelCount > 1 ? count * levelCount : count;
const modeLabel = levelCount && levelCount > 1
    ? `multi-level (${levelCount} levels × ${count} questions)`
    : sameDifficulty
        ? "yes"
        : "no (ascending)";

console.log(`\n🧠 NeuroQuest AI — Quiz Question Generator`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Planet rollup    : ${rollup}`);
console.log(`  Questions/level  : ${count}`);
if (levelCount && levelCount > 1) {
    console.log(`  Level count      : ${levelCount}`);
    console.log(`  Total questions  : ${totalQuestions}`);
}
console.log(`  Difficulty mode  : ${modeLabel}`);
console.log(`  Server           : ${host}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

const TIMEOUT_MS = 180_000; // 3 minutes

/**
 * Send the generation request to the API.
 * @param {string|undefined} overview - optional topic overview for new rollups
 */
async function callGenerateApi(overview) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const bodyPayload = { rollup, count, sameDifficulty };
    if (levelCount !== undefined) {
        bodyPayload.levelCount = levelCount;
    }
    if (overview) {
        bodyPayload.overview = overview;
    }

    const res = await fetch(`${host}/api/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
    });

    clearTimeout(timeout);

    // Guard against non-JSON responses (e.g. HTML error pages)
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        const text = await res.text();
        console.error(`❌ Server returned non-JSON response (HTTP ${res.status}):`);
        console.error(text.substring(0, 500));
        process.exit(1);
    }

    return { res, data: await res.json() };
}

try {
    console.log("⏳ Calling LLM… this may take 15–60 seconds.\n");

    let { res, data } = await callGenerateApi();

    // ── Handle "needs overview" response ──────────────────────────────
    if (!res.ok && data.needsOverview) {
        const overview = await promptForOverview(rollup);
        if (!overview) {
            console.error("\n❌ No overview provided. Cannot generate questions for an unknown rollup.");
            process.exit(1);
        }
        console.log(`\n✅ Overview received (${overview.length} chars). Sending to LLM…\n`);
        console.log("⏳ Creating planet & generating questions… this may take 15–60 seconds.\n");
        ({ res, data } = await callGenerateApi(overview));
    }

    if (!res.ok || !data.success) {
        console.error(`❌ Generation failed (HTTP ${res.status}):`);
        console.error(JSON.stringify(data, null, 2));
        process.exit(1);
    }

    console.log(`✅ Successfully generated ${data.questionsInserted} questions!`);
    if (data.skippedDuplicates > 0) {
        console.log(`   ⚠️  ${data.skippedDuplicates} duplicate(s) skipped.`);
    }
    console.log();

    if (data.questions && data.questions.length > 0) {
        console.log("┌────────┬───────┬────────┬───────┬────────────────────────────────────────────────────────────┐");
        console.log("│  Q ID  │ Level │  Q Num │   XP  │ Question                                                   │");
        console.log("├────────┼───────┼────────┼───────┼────────────────────────────────────────────────────────────┤");
        for (const q of data.questions) {
            const id = String(q.question_id).padStart(6);
            const lvl = String(q.level_number).padStart(5);
            const qn = String(q.question_number).padStart(6);
            const xp = String(q.xp_reward).padStart(5);
            const text = q.question_text.substring(0, 58).padEnd(58);
            console.log(`│ ${id} │ ${lvl} │ ${qn} │ ${xp} │ ${text} │`);
        }
        console.log("└────────┴───────┴────────┴───────┴────────────────────────────────────────────────────────────┘");
    }

    // Summary line
    if (data.levelCount > 1 && data.levelNumbers) {
        console.log(`\n📊 Summary: ${data.questionsInserted}/${data.questionsRequested} questions inserted for planet "${data.planet}" across levels ${data.levelNumbers.join(", ")}.`);
        console.log(`   📐 Mode: multi-level (${data.levelCount} difficulty tiers).`);
    } else {
        console.log(`\n📊 Summary: ${data.questionsInserted}/${data.questionsRequested} questions inserted for planet "${data.planet}" at level ${data.levelNumber}.`);
        if (data.sameDifficulty) {
            console.log(`   🎯 Mode: uniform difficulty (all questions at same level).`);
        }
    }
} catch (err) {
    if (err.name === "AbortError") {
        console.error(`❌ Request timed out after ${TIMEOUT_MS / 1000}s.`);
        console.error("   The LLM may be overloaded. Try again later.");
    } else {
        console.error("❌ Failed to connect to the server:", err.message);
        console.error("   Make sure the dev server is running: npm run dev");
    }
    process.exit(1);
}
