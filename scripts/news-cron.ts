#!/usr/bin/env npx tsx
/**
 * CLI script to trigger the news cron pipeline.
 *
 * Pipeline steps:
 *   1. Sync RSS feed list
 *   2. Fetch new articles from all enabled feeds
 *   3. Backfill full-text for articles missing it
 *   4. LLM-rank articles into 5 difficulty tiers (3 per tier = 15 total)
 *   5. Generate reading-comprehension questions for each selected article
 *
 * Usage:
 *   npx tsx scripts/news-cron.ts
 *   npx tsx scripts/news-cron.ts --host http://localhost:3000
 *
 * Requires:
 *   - The dev server to be running (hits localhost:3000/api/news/cron)
 *   - OPENROUTER_API_KEY to be set in the dev server's environment
 */

import { parseArgs } from "node:util";

const TIMEOUT_MS = 300_000; // 5 minutes — the cron pipeline can be slow

// ─── Types ───────────────────────────────────────────────────────────────────

interface CliOptions {
    host: string;
}

interface CronResponse {
    success?: boolean;
    message?: string;
    error?: string;
    run_id?: string;
    newArticlesFetched?: number;
    articlesSelected?: number;
    questionsGenerated?: number;
    questionsFailed?: number;
    feedsOk?: number;
    feedsFailed?: number;
}

// ─── CLI Parsing ─────────────────────────────────────────────────────────────

function parseCli(): CliOptions {
    const { values } = parseArgs({
        options: {
            host: { type: "string", short: "h", default: "http://localhost:3000" },
        },
    });

    return { host: values.host! };
}

// ─── Output Formatting ──────────────────────────────────────────────────────

function printBanner(opts: CliOptions): void {
    console.log(`\n📡 NeuroQuest AI — News Cron Pipeline`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Server           : ${opts.host}`);
    console.log(`  Timeout          : ${TIMEOUT_MS / 1000}s`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log();
    console.log(`  Pipeline steps:`);
    console.log(`    1. Sync RSS feed list`);
    console.log(`    2. Fetch new articles from enabled feeds`);
    console.log(`    3. Backfill full-text content`);
    console.log(`    4. LLM-rank articles into 5 tiers`);
    console.log(`    5. Generate comprehension questions`);
    console.log();
}

function printResult(data: CronResponse): void {
    console.log(`\n📊 Pipeline Results`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const rows: [string, string | number][] = [];

    if (data.run_id != null) rows.push(["Scan Run ID", data.run_id]);
    if (data.feedsOk != null) rows.push(["Feeds OK", data.feedsOk]);
    if (data.feedsFailed != null) rows.push(["Feeds Failed", data.feedsFailed]);
    if (data.newArticlesFetched != null) rows.push(["New Articles Fetched", data.newArticlesFetched]);
    if (data.articlesSelected != null) rows.push(["Articles Selected", data.articlesSelected]);
    if (data.questionsGenerated != null) rows.push(["Questions Generated", data.questionsGenerated]);
    if (data.questionsFailed != null) rows.push(["Questions Failed", data.questionsFailed]);

    if (rows.length === 0) {
        console.log(`  (no detailed stats returned)`);
    } else {
        const labelWidth = Math.max(...rows.map(([label]) => label.length));
        for (const [label, value] of rows) {
            const icon = label.includes("Failed") && Number(value) > 0 ? "⚠️ " : "  ";
            console.log(`${icon}${label.padEnd(labelWidth)}  : ${value}`);
        }
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const opts = parseCli();
    printBanner(opts);

    console.log("⏳ Running pipeline… this may take 1–5 minutes.\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    let data: CronResponse;

    try {
        res = await fetch(`${opts.host}/api/news/cron`, {
            signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            const text = await res.text();
            throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.substring(0, 500)}`);
        }

        data = (await res.json()) as CronResponse;
    } finally {
        clearTimeout(timeout);
    }

    // ── Early exit: no articles to rank (not an error)
    if (res.ok && data.message) {
        console.log(`ℹ️  ${data.message}`);
        if (data.run_id) console.log(`   Run ID: ${data.run_id}`);
        console.log();
        return;
    }

    // ── Error
    if (!res.ok || !data.success) {
        console.error(`❌ Pipeline failed (HTTP ${res.status}):`);
        if (data.error) console.error(`   ${data.error}`);
        if (data.run_id) console.error(`   Run ID: ${data.run_id}`);
        console.error();
        process.exit(1);
    }

    // ── Success
    console.log(`✅ Pipeline completed successfully!`);
    printResult(data);

    // Quick scan-logs hint
    console.log(`💡 View detailed logs:`);
    console.log(`   curl ${opts.host}/api/news/scan-logs?run_id=${data.run_id}\n`);
}

main().catch((err: Error & { name?: string }) => {
    if (err.name === "AbortError") {
        console.error(`❌ Request timed out after ${TIMEOUT_MS / 1000}s.`);
        console.error("   The pipeline may still be running on the server.");
        console.error("   Check scan logs: curl http://localhost:3000/api/news/scan-logs");
    } else {
        console.error("❌ Failed:", err.message);
        console.error("   Make sure the dev server is running: npm run dev");
    }
    process.exit(1);
});
