#!/usr/bin/env tsx
/**
 * convert-3mf-to-glb.ts
 *
 * Converts one or more .3mf files into binary .glb (GLTF) files.
 *
 * RECOMMENDED: Run via the npm shortcut (already includes --max-old-space-size=4096):
 *   npm run convert-3mf -- model.3mf
 *
 * Or directly, but with the heap flag for large files:
 *   NODE_OPTIONS='--max-old-space-size=4096' npx tsx scripts/convert-3mf-to-glb.ts model.3mf
 *
 * Options:
 *   --output, -o    Output .glb file path (only valid for single-file input)
 *   --dir,    -d    Directory to scan for .3mf files (recursive)
 *   --out-dir       Directory where converted .glb files are written (default: data/glb/)
 *   --help,   -h    Show this help message
 *
 * Examples:
 *   npm run convert-3mf -- model.3mf
 *   npm run convert-3mf -- model.3mf -o public/models/model.glb
 *   npx tsx scripts/convert-3mf-to-glb.ts --dir ./assets/3mf --out-dir ./public/models
 */

// ---------------------------------------------------------------------------
// Node.js / DOM shims — must happen BEFORE importing Three.js modules
// The ThreeMFLoader uses DOMParser internally to parse XML; jsdom provides it.
// ---------------------------------------------------------------------------
import { JSDOM } from 'jsdom';

const dom = new JSDOM('');
const g = global as unknown as Record<string, unknown>;

// Expose browser globals that Three.js addons rely on (before importing Three.js)
if (typeof global.DOMParser === 'undefined') g.DOMParser = dom.window.DOMParser;
if (typeof global.document === 'undefined') g.document = dom.window.document;
if (typeof global.Blob === 'undefined') g.Blob = dom.window.Blob;   // Node 18+ has Blob natively
if (typeof global.URL === 'undefined') g.URL = dom.window.URL;

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Group } from 'three';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function printHelp(): void {
    console.log(`
convert-3mf-to-glb — Convert 3MF files to binary GLB (glTF)

Usage (recommended — includes extra heap memory automatically):
  npm run convert-3mf -- <input.3mf>
  npm run convert-3mf -- --dir <directory> [--out-dir <directory>]

Direct invocation (add NODE_OPTIONS for large files):
  NODE_OPTIONS='--max-old-space-size=4096' npx tsx scripts/convert-3mf-to-glb.ts <input.3mf>
  NODE_OPTIONS='--max-old-space-size=4096' npx tsx scripts/convert-3mf-to-glb.ts <input.3mf> --output <output.glb>
  NODE_OPTIONS='--max-old-space-size=4096' npx tsx scripts/convert-3mf-to-glb.ts --dir <directory> [--out-dir <directory>]

Options:
  --output, -o    Output .glb file path (single file only)
  --dir,    -d    Directory to scan for .3mf files (recursive)
  --out-dir       Directory for converted .glb files (default: data/glb/)
  --help,   -h    Show this message

Defaults:
  When --output and --out-dir are both omitted, .glb files are written to
  <project-root>/data/glb/<basename>.glb

Tip: Large or detailed 3MF files may require more heap memory.
  The npm shortcut (npm run convert-3mf) already sets --max-old-space-size=4096.
`);
}

function findThreeMFFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findThreeMFFiles(fullPath));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.3mf')) {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * Convert a single .3mf file (given as an ArrayBuffer) into a GLB ArrayBuffer
 * using Three.js ThreeMFLoader + GLTFExporter.
 */
async function convertBuffer(inputBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    // 1. Parse 3MF → Three.js Group
    const loader = new ThreeMFLoader();
    const group: Group = loader.parse(inputBuffer);

    // 2. Export Group → GLB binary
    const exporter = new GLTFExporter();
    const glb = await exporter.parseAsync(group, { binary: true }) as ArrayBuffer;

    return glb;
}

/**
 * Convert a .3mf file on disk and write the resulting .glb file.
 */
async function convertFile(inputPath: string, outputPath: string): Promise<void> {
    console.log(`  Converting: ${path.relative(process.cwd(), inputPath)}`);
    console.log(`        → ${path.relative(process.cwd(), outputPath)}`);

    const rawBuffer = fs.readFileSync(inputPath);
    // Convert Node Buffer → ArrayBuffer
    const arrayBuffer: ArrayBuffer = rawBuffer.buffer.slice(
        rawBuffer.byteOffset,
        rawBuffer.byteOffset + rawBuffer.byteLength,
    ) as ArrayBuffer;

    const glb = await convertBuffer(arrayBuffer);

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Write GLB
    fs.writeFileSync(outputPath, Buffer.from(glb));

    const kb = (glb.byteLength / 1024).toFixed(1);
    console.log(`     ✅  Done  (${kb} KB)\n`);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const { values, positionals } = parseArgs({
        args: process.argv.slice(2),
        options: {
            output: { type: 'string', short: 'o' },
            dir: { type: 'string', short: 'd' },
            'out-dir': { type: 'string' },
            help: { type: 'boolean', short: 'h' },
        },
        allowPositionals: true,
        strict: false,
    });

    if (values.help) {
        printHelp();
        process.exit(0);
    }

    // Collect input files
    let inputFiles: string[] = [];

    if (values.dir) {
        const dir = path.resolve(values.dir as string);
        if (!fs.existsSync(dir)) {
            console.error(`❌  Directory not found: ${dir}`);
            process.exit(1);
        }
        inputFiles = findThreeMFFiles(dir);
        if (inputFiles.length === 0) {
            console.error(`❌  No .3mf files found in: ${dir}`);
            process.exit(1);
        }
    } else if (positionals.length > 0) {
        inputFiles = positionals.map((p) => path.resolve(p));
    } else {
        printHelp();
        process.exit(1);
    }

    // Validate inputs
    for (const f of inputFiles) {
        if (!fs.existsSync(f)) {
            console.error(`❌  File not found: ${f}`);
            process.exit(1);
        }
    }

    // Determine output path(s)
    if ((values.output as string | undefined) && inputFiles.length > 1) {
        console.error('❌  --output can only be used with a single input file.');
        process.exit(1);
    }

    const outDir = values['out-dir']
        ? path.resolve(values['out-dir'] as string)
        : path.resolve(process.cwd(), 'data', 'glb');  // default output directory

    console.log(`\n🔄  3MF → GLB Converter  (${inputFiles.length} file${inputFiles.length !== 1 ? 's' : ''})\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const inputPath of inputFiles) {
        let outputPath: string;

        if (values.output) {
            outputPath = path.resolve(values.output as string);
        } else {
            const baseName = path.basename(inputPath, path.extname(inputPath));
            outputPath = path.join(outDir, `${baseName}.glb`);
        }

        try {
            await convertFile(inputPath, outputPath);
            successCount++;
        } catch (err) {
            console.error(`  ❌  Failed to convert ${path.basename(inputPath)}:`);
            console.error(`     ${(err as Error).message}\n`);
            errorCount++;
        }
    }

    console.log('─'.repeat(50));
    console.log(`✅  Succeeded: ${successCount}  |  ❌  Failed: ${errorCount}`);

    if (errorCount > 0) process.exit(1);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
