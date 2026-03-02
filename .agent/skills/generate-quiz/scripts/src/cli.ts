/**
 * CLI argument parsing and help output.
 */

import type { CliArgs } from "./types.js";

const USAGE = `
insert-question — Insert quiz questions into the database.

SINGLE QUESTION:
  npx tsx .agent/skills/generate-quiz/scripts/insert-question.ts \\
    --rollup <rollup> \\
    --level <N> \\
    --title <level title> \\
    --question <text> \\
    --options '<JSON array>' \\
    --correct <0-3> \\
    --explanation <text> \\
    [--xp <N>] [--upsert] [--dry-run] [--yes]

BATCH MODE:
  npx tsx .agent/skills/generate-quiz/scripts/insert-question.ts \\
    --file <path.json> [--upsert] [--dry-run] [--yes]

FLAGS:
  -r, --rollup       Planet rollup name (e.g. "prompt")
  -l, --level        Target level_number (required)
  -t, --title        Level title (required, used when creating level row)
  -q, --question     Question text
  -o, --options      JSON array of 4 options
  -c, --correct      Correct option index (0–3)
  -e, --explanation  Explanation for the correct answer
      --xp           Override auto-computed xp_reward
  -f, --file         Path to a JSON file for batch insert
      --upsert       Update existing on unique constraint conflict
      --dry-run      Validate and preview without writing to DB
  -y, --yes          Skip interactive confirmation
  -h, --help         Show this help message
`;

export function printUsage(): void {
    console.log(USAGE);
}

export function parseCliArgs(argv: string[] = process.argv.slice(2)): CliArgs {
    const result: CliArgs = { upsert: false, dryRun: false, yes: false };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const next = (): string => {
            if (i + 1 >= argv.length) {
                throw new Error(`Missing value for ${arg}`);
            }
            return argv[++i];
        };

        switch (arg) {
            case "--file":
            case "-f":
                result.file = next();
                break;
            case "--rollup":
            case "-r":
                result.rollup = next();
                break;
            case "--question":
            case "-q":
                result.question = next();
                break;
            case "--options":
            case "-o":
                try {
                    result.options = JSON.parse(next());
                } catch {
                    throw new Error('--options must be a valid JSON array, e.g. \'["A","B","C","D"]\'');
                }
                break;
            case "--correct":
            case "-c":
                result.correct = parseInt(next(), 10);
                break;
            case "--explanation":
            case "-e":
                result.explanation = next();
                break;
            case "--level":
            case "-l":
                result.level = parseInt(next(), 10);
                break;
            case "--title":
            case "-t":
                result.title = next();
                break;
            case "--xp":
                result.xp = parseInt(next(), 10);
                break;
            case "--upsert":
                result.upsert = true;
                break;
            case "--dry-run":
                result.dryRun = true;
                break;
            case "--yes":
            case "-y":
                result.yes = true;
                break;
            case "--help":
            case "-h":
                printUsage();
                process.exit(0);
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return result;
}
