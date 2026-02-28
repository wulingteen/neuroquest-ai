#!/usr/bin/env node
/**
 * CLI script to generate quiz questions for a specific planet.
 *
 * Usage:
 *   node scripts/generate-quiz.mjs --rollup prompt --count 5
 *   node scripts/generate-quiz.mjs -r model -c 3
 *   node scripts/generate-quiz.mjs -r prompt -c 5 --same-difficulty
 *
 * Requires:
 *   - The dev server to be running (it hits localhost:3000/api/quiz/generate)
 *   - OPENROUTER_API_KEY to be set in the dev server's environment
 */

import { parseArgs } from "node:util";

const VALID_ROLLUPS = ["prompt", "model", "vision", "ethics", "agent", "future"];

const { values } = parseArgs({
    options: {
        rollup: { type: "string", short: "r" },
        count: { type: "string", short: "c", default: "5" },
        host: { type: "string", short: "h", default: "http://localhost:3000" },
        "same-difficulty": { type: "boolean", short: "s", default: false },
    },
});

const rollup = values.rollup;
const count = parseInt(values.count, 10);
const host = values.host;
const sameDifficulty = values["same-difficulty"] === true;

if (!rollup) {
    console.error("❌ Missing --rollup flag. Example: --rollup prompt");
    console.error(`\nAvailable rollups: ${VALID_ROLLUPS.join(", ")}`);
    process.exit(1);
}

if (!VALID_ROLLUPS.includes(rollup)) {
    console.error(`❌ Unknown rollup "${rollup}".`);
    console.error(`   Available rollups: ${VALID_ROLLUPS.join(", ")}`);
    process.exit(1);
}

if (isNaN(count) || count < 1 || count > 20) {
    console.error("❌ --count must be an integer between 1 and 20.");
    process.exit(1);
}

console.log(`\n🧠 NeuroQuest AI — Quiz Question Generator`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Planet rollup    : ${rollup}`);
console.log(`  Questions        : ${count}`);
console.log(`  Same difficulty  : ${sameDifficulty ? "yes" : "no (ascending)"}`);
console.log(`  Server           : ${host}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
console.log("⏳ Calling LLM… this may take 15–60 seconds.\n");

const TIMEOUT_MS = 180_000; // 3 minutes

try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${host}/api/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollup, count, sameDifficulty }),
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

    const data = await res.json();

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

    console.log(`\n📊 Summary: ${data.questionsInserted}/${data.questionsRequested} questions inserted for planet "${data.planet}" at level ${data.levelNumber}.`);
    if (data.sameDifficulty) {
        console.log(`   🎯 Mode: uniform difficulty (all questions at same level).`);
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
