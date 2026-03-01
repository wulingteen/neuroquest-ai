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

const TIMEOUT_MS = 180_000; // 3 minutes

// ─── CLI Parsing & Validation ────────────────────────────────────────────────

function parseCli() {
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
    const levelCount = values["level-count"] ? parseInt(values["level-count"], 10) : undefined;

    const errors = [];
    if (!rollup) errors.push("Missing --rollup flag. Example: --rollup prompt");
    else if (rollup.length > 50) errors.push("--rollup must be 50 characters or fewer.");
    if (isNaN(count) || count < 1 || count > 20) errors.push("--count must be an integer between 1 and 20.");
    if (levelCount !== undefined && (isNaN(levelCount) || levelCount < 1 || levelCount > 10))
        errors.push("--level-count must be an integer between 1 and 10.");
    if (levelCount > 1 && sameDifficulty)
        errors.push("--same-difficulty and --level-count > 1 cannot be used together.");

    if (errors.length > 0) {
        for (const e of errors) console.error(`❌ ${e}`);
        process.exit(1);
    }

    const isMultiLevel = levelCount > 1;
    return { rollup, count, host, sameDifficulty, levelCount, isMultiLevel };
}

// ─── Interactive Overview Prompt ─────────────────────────────────────────────

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
        rl.on("close", () => resolve(lines.join("\n").trim()));
    });
}

// ─── API Call ────────────────────────────────────────────────────────────────

async function callGenerateApi({ host, rollup, count, sameDifficulty, levelCount }, overview) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const body = { rollup, count, sameDifficulty };
    if (levelCount !== undefined) body.levelCount = levelCount;
    if (overview) body.overview = overview;

    try {
        const res = await fetch(`${host}/api/quiz/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            const text = await res.text();
            throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.substring(0, 500)}`);
        }

        return { res, data: await res.json() };
    } finally {
        clearTimeout(timeout);
    }
}

// ─── Output Formatting ──────────────────────────────────────────────────────

function printBanner({ rollup, count, host, sameDifficulty, levelCount, isMultiLevel }) {
    const totalQuestions = isMultiLevel ? count * levelCount : count;
    const modeLabel = isMultiLevel
        ? `multi-level (${levelCount} levels × ${count} questions)`
        : sameDifficulty ? "yes" : "no (ascending)";

    console.log(`\n🧠 NeuroQuest AI — Quiz Question Generator`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Planet rollup    : ${rollup}`);
    console.log(`  Questions/level  : ${count}`);
    if (isMultiLevel) {
        console.log(`  Level count      : ${levelCount}`);
        console.log(`  Total questions  : ${totalQuestions}`);
    }
    console.log(`  Difficulty mode  : ${modeLabel}`);
    console.log(`  Server           : ${host}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

function printResultTable(questions) {
    if (!questions?.length) return;

    const cols = [
        { header: "Q ID", width: 6, align: "right", value: (q) => String(q.question_id) },
        { header: "Level", width: 5, align: "right", value: (q) => String(q.level_number) },
        { header: "Q Num", width: 6, align: "right", value: (q) => String(q.question_number) },
        { header: "XP", width: 5, align: "right", value: (q) => String(q.xp_reward) },
        { header: "Question", width: 58, align: "left", value: (q) => q.question_text.substring(0, 58) },
    ];

    const sep = (left, mid, right) =>
        left + cols.map((c) => "─".repeat(c.width + 2)).join(mid) + right;
    const cell = (val, col) => col.align === "right" ? val.padStart(col.width) : val.padEnd(col.width);
    const row = (cells) =>
        "│ " + cells.map((val, i) => cell(val, cols[i])).join(" │ ") + " │";

    console.log(sep("┌", "┬", "┐"));
    console.log(row(cols.map((c) => c.header)));
    console.log(sep("├", "┼", "┤"));
    for (const q of questions) console.log(row(cols.map((c) => c.value(q))));
    console.log(sep("└", "┴", "┘"));
}

function printSummary(data) {
    const base = `${data.questionsInserted}/${data.questionsRequested} questions inserted for planet "${data.planet}"`;
    if (data.levelCount > 1 && data.levelNumbers) {
        console.log(`\n📊 Summary: ${base} across levels ${data.levelNumbers.join(", ")}.`);
        console.log(`   📐 Mode: multi-level (${data.levelCount} difficulty tiers).`);
    } else {
        console.log(`\n📊 Summary: ${base} at level ${data.levelNumber}.`);
        if (data.sameDifficulty) {
            console.log(`   🎯 Mode: uniform difficulty (all questions at same level).`);
        }
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    const opts = parseCli();
    printBanner(opts);

    console.log("⏳ Calling LLM… this may take 15–60 seconds.\n");
    let { res, data } = await callGenerateApi(opts);

    // Handle "needs overview" for unregistered rollups
    if (!res.ok && data.needsOverview) {
        const overview = await promptForOverview(opts.rollup);
        if (!overview) {
            console.error("\n❌ No overview provided. Cannot generate questions for an unknown rollup.");
            process.exit(1);
        }
        console.log(`\n✅ Overview received (${overview.length} chars). Sending to LLM…\n`);
        console.log("⏳ Creating planet & generating questions… this may take 15–60 seconds.\n");
        ({ res, data } = await callGenerateApi(opts, overview));
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

    printResultTable(data.questions);
    printSummary(data);
}

main().catch((err) => {
    if (err.name === "AbortError") {
        console.error(`❌ Request timed out after ${TIMEOUT_MS / 1000}s.`);
        console.error("   The LLM may be overloaded. Try again later.");
    } else {
        console.error("❌ Failed:", err.message);
        console.error("   Make sure the dev server is running: npm run dev");
    }
    process.exit(1);
});
