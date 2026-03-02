/**
 * CLI argument parser for export-roadmaps.
 *
 * Parses process.argv and exposes a typed options object.
 */

export interface CliOptions {
    /** Positional slugs / label queries (everything that isn't a flag or flag-value). */
    slugs: string[];
    /** --json flag: output structured JSON. */
    jsonOutput: boolean;
    /** --pretty / -p flag: pretty-print JSON. */
    pretty: boolean;
    /** --graph flag: cross-roadmap relationship graph mode. */
    graphMode: boolean;
    /** --all flag: include all roadmaps (used with --graph). */
    allMode: boolean;
    /** -o / --output value: explicit output file path. */
    outFile: string | undefined;
    /** --depth value: max traversal depth for graph mode. */
    maxDepth: number;
}

export function parseCliArgs(argv: string[] = process.argv.slice(2)): CliOptions {
    const pretty = argv.includes('--pretty') || argv.includes('-p');
    const jsonOutput = argv.includes('--json');
    const graphMode = argv.includes('--graph');
    const allMode = argv.includes('--all');

    const outIdx = argv.findIndex((a) => a === '-o' || a === '--output');
    const outFile = outIdx !== -1 ? argv[outIdx + 1] : undefined;

    const depthIdx = argv.findIndex((a) => a === '--depth');
    const maxDepth = depthIdx !== -1 ? parseInt(argv[depthIdx + 1], 10) : Infinity;

    // Collect flag-value tokens so we can exclude them from positional slugs
    const flagValues = new Set<string>();
    if (outIdx !== -1 && argv[outIdx + 1]) flagValues.add(argv[outIdx + 1]);
    if (depthIdx !== -1 && argv[depthIdx + 1]) flagValues.add(argv[depthIdx + 1]);

    const slugs = argv.filter(
        (a) => !a.startsWith('-') && !flagValues.has(a),
    );

    return { slugs, jsonOutput, pretty, graphMode, allMode, outFile, maxDepth };
}
