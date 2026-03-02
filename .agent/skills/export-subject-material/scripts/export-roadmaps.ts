/**
 * Export Roadmap Tree
 *
 * Reads roadmap data from export-subject-material/assets/roadmaps/ and outputs the internal
 * node labels and hierarchical relationships for a specified roadmap.
 *
 * A JSON file is always written to export-subject-material/scripts/output/<slug>.json (overwriting
 * any existing file) regardless of output mode.
 *
 * Usage:
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts <slug>                  # ASCII tree (single roadmap)
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts <slug> --json           # JSON output
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts <slug> --json --pretty  # pretty JSON
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts <slug> -o tree.json     # write to file
 *
 * Topic content lookup:
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts <slug> <label>          # print content for a label
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts react "Vite"            # exact or substring match
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts react vite              # case-insensitive
 *
 * Cross-roadmap relationship graph:
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts --graph <slug> [slug2 ...]  # ASCII graph of related roadmaps
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts --graph --all               # graph of ALL roadmaps
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts --graph <slug> --depth 2    # limit traversal depth
 *   npx tsx export-subject-material/scripts/export-roadmaps.ts --graph <slug> --json       # JSON output
 */

import fs from 'node:fs';
import path from 'node:path';

import { parseCliArgs } from './lib/cli.js';
import { ROADMAPS_DIR, OUTPUT_DIR } from './lib/paths.js';
import { readFrontmatter, listAllSlugs } from './lib/roadmap-io.js';
import {
    renderAsciiTree,
    toHierarchyNode,
    findNodesByLabel,
    readContentFile,
    buildRoadmapTree,
} from './lib/tree-renderer.js';
import {
    buildRelationsMap,
    expandGraphNode,
    renderGraphAscii,
    toGraphJson,
} from './lib/graph.js';
import type { RoadmapNode } from './lib/types.js';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
    const opts = parseCliArgs();
    const { slugs, jsonOutput, pretty, graphMode, allMode, outFile, maxDepth } = opts;

    const allSlugs = listAllSlugs();

    // ---- Graph mode: cross-roadmap relationships ----
    if (graphMode) {
        const targetSlugs = allMode ? allSlugs : slugs;

        if (targetSlugs.length === 0) {
            console.error(
                'Usage: npx tsx export-subject-material/scripts/export-roadmaps.ts --graph <slug> [slug2 ...] [--all] [--depth N] [--json] [--pretty] [-o <file>]\n',
            );
            console.error('Available roadmaps:\n');
            for (const s of allSlugs) console.error(`   ${s}`);
            process.exit(1);
        }

        // Validate slugs
        for (const slug of targetSlugs) {
            if (!allSlugs.includes(slug)) {
                console.error(
                    `❌ Unknown roadmap "${slug}". Available roadmaps:\n`,
                );
                for (const s of allSlugs) console.error(`   ${s}`);
                process.exit(1);
            }
        }

        console.error(`🔍 Building relationship map for ${allMode ? 'all' : targetSlugs.length} roadmap(s)...`);

        // Build the full relations map (only for slugs reachable from targets)
        const slugsToLoad = new Set(targetSlugs);
        if (maxDepth > 1 || maxDepth === Infinity) {
            for (const s of allSlugs) slugsToLoad.add(s);
        } else {
            for (const slug of targetSlugs) {
                const fm = readFrontmatter(slug);
                if (fm?.relatedRoadmaps) {
                    for (const r of fm.relatedRoadmaps) {
                        if (allSlugs.includes(r)) slugsToLoad.add(r);
                    }
                }
            }
        }

        const relationsMap = buildRelationsMap([...slugsToLoad]);

        // Build graph trees rooted at each target slug
        const globalVisited = new Set<string>();
        const graphRoots = [];

        for (const slug of targetSlugs) {
            if (globalVisited.has(slug)) continue;
            if (!relationsMap.has(slug)) continue;
            graphRoots.push(
                expandGraphNode(slug, relationsMap, globalVisited, 0, maxDepth),
            );
        }

        // Build JSON payload
        const payload = {
            mode: 'graph',
            rootCount: graphRoots.length,
            depth: maxDepth === Infinity ? 'unlimited' : maxDepth,
            graph: graphRoots.map(toGraphJson),
        };

        // Always save JSON to output/
        const autoJsonStr = JSON.stringify(payload, null, 2);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        const autoJsonFilename =
            targetSlugs.length === 1 && !allMode
                ? `${targetSlugs[0]}-graph.json`
                : 'roadmap-graph.json';
        const autoJsonPath = path.join(OUTPUT_DIR, autoJsonFilename);
        fs.writeFileSync(autoJsonPath, autoJsonStr, 'utf-8');
        console.error(
            `📦 JSON saved → ${path.relative(process.cwd(), autoJsonPath)}`,
        );

        if (jsonOutput) {
            const jsonStr = JSON.stringify(payload, null, pretty ? 2 : undefined);
            if (outFile) {
                const outPath = path.resolve(outFile);
                fs.mkdirSync(path.dirname(outPath), { recursive: true });
                fs.writeFileSync(outPath, jsonStr, 'utf-8');
                console.error(`✅ Graph written → ${outPath}`);
            } else {
                process.stdout.write(jsonStr + '\n');
            }
        } else {
            const header = `Roadmap Relationship Graph (${graphRoots.length} root(s), depth: ${maxDepth === Infinity ? '∞' : maxDepth})`;
            const asciiGraph = renderGraphAscii(graphRoots);
            const output = `${header}\n${asciiGraph}\n`;

            if (outFile) {
                const outPath = path.resolve(outFile);
                fs.mkdirSync(path.dirname(outPath), { recursive: true });
                fs.writeFileSync(outPath, output, 'utf-8');
                console.error(`✅ Graph written → ${outPath}`);
            } else {
                process.stdout.write(output);
            }
        }

        return;
    }

    // ---- Single-roadmap tree mode ----
    if (slugs.length === 0) {
        console.error(
            'Usage: npx tsx export-subject-material/scripts/export-roadmaps.ts <slug> [<label>] [--json] [--pretty] [-o <file>]\n',
        );
        console.error('  Topic content lookup:');
        console.error(
            '    npx tsx export-subject-material/scripts/export-roadmaps.ts <slug> "<label>"\n',
        );
        console.error('  Cross-roadmap graph:');
        console.error(
            '    npx tsx export-subject-material/scripts/export-roadmaps.ts --graph <slug> [slug2 ...] [--all] [--depth N]\n',
        );
        console.error('Available roadmaps:\n');
        for (const s of allSlugs) console.error(`   ${s}`);
        process.exit(1);
    }

    const slug = slugs[0];
    const labelQuery = slugs.slice(1).join(' ');

    if (!allSlugs.includes(slug)) {
        console.error(`❌ Unknown roadmap "${slug}". Available roadmaps:\n`);
        for (const s of allSlugs) console.error(`   ${s}`);
        process.exit(1);
    }

    const result = buildRoadmapTree(slug);
    if (!result) process.exit(1);

    const { tree, topicCount, frontmatter } = result;
    const title = frontmatter.title ?? slug;

    // ---- Label content lookup mode ----
    if (labelQuery) {
        const matches = findNodesByLabel(tree, labelQuery);

        if (matches.length === 0) {
            console.error(`❌ No topic matching "${labelQuery}" in roadmap "${slug}".\n`);
            console.error('Available topics:\n');
            const listAll = (nodes: RoadmapNode[], indent = '') => {
                for (const n of nodes) {
                    console.error(`${indent}  • ${n.label}`);
                    listAll(n.children, indent + '  ');
                }
            };
            listAll(tree);
            process.exit(1);
        }

        if (matches.length > 1) {
            console.error(`🔎 Multiple topics match "${labelQuery}":\n`);
            for (const m of matches) {
                const cf = m.contentFile ? ` → ${m.contentFile}` : ' (no content file)';
                console.error(`   • ${m.label}${cf}`);
            }
            console.error(
                '\nShowing content for the first match. Use a more specific label to narrow down.\n',
            );
        }

        const matchNode = matches[0];
        if (!matchNode.contentFile) {
            console.error(`⚠  Topic "${matchNode.label}" has no content file.`);
            process.exit(1);
        }

        const content = readContentFile(slug, matchNode.contentFile);
        if (!content) {
            console.error(`⚠  Content file "${matchNode.contentFile}" not found on disk.`);
            process.exit(1);
        }

        const contentPath = path.join(
            ROADMAPS_DIR,
            slug,
            'content',
            matchNode.contentFile,
        );
        console.error(
            `📄 ${matchNode.label} (${slug}) → ${path.relative(process.cwd(), contentPath)}\n`,
        );
        process.stdout.write(content);
        if (!content.endsWith('\n')) process.stdout.write('\n');
        return;
    }

    // ---- Normal tree output ----
    const payload = {
        slug,
        title,
        topicCount,
        tree: tree.map(toHierarchyNode),
    };
    const autoJsonStr = JSON.stringify(payload, null, 2);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const autoJsonPath = path.join(OUTPUT_DIR, `${slug}.json`);
    fs.writeFileSync(autoJsonPath, autoJsonStr, 'utf-8');
    console.error(
        `📦 JSON saved → ${path.relative(process.cwd(), autoJsonPath)}`,
    );

    if (jsonOutput) {
        const jsonStr = JSON.stringify(payload, null, pretty ? 2 : undefined);

        if (outFile) {
            const outPath = path.resolve(outFile);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, jsonStr, 'utf-8');
            console.error(`✅ Tree for "${slug}" (${topicCount} nodes) → ${outPath}`);
        } else {
            process.stdout.write(jsonStr + '\n');
        }
    } else {
        const header = `${title} (${topicCount} nodes)`;
        const asciiTree = renderAsciiTree(tree);
        const output = `${header}\n${asciiTree}\n`;

        if (outFile) {
            const outPath = path.resolve(outFile);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, output, 'utf-8');
            console.error(`✅ Tree for "${slug}" (${topicCount} nodes) → ${outPath}`);
        } else {
            process.stdout.write(output);
        }
    }
}

main();
