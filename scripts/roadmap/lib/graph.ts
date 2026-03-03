/**
 * Cross-roadmap relationship graph.
 *
 * Builds a graph of connected roadmaps using the `relatedRoadmaps` field
 * in each roadmap's frontmatter, rendered as ASCII or JSON.
 */

import type { GraphNode } from './types.js';
import { readFrontmatter } from './roadmap-io.js';
import { buildRoadmapTree } from './tree-renderer.js';

// ---------------------------------------------------------------------------
// Relations map
// ---------------------------------------------------------------------------

/**
 * Read all roadmap frontmatters and build a lookup of slug → relatedRoadmaps.
 */
export function buildRelationsMap(
    availableSlugs: string[],
): Map<string, { title: string; topicCount: number; related: string[] }> {
    const map = new Map<
        string,
        { title: string; topicCount: number; related: string[] }
    >();
    for (const slug of availableSlugs) {
        const fm = readFrontmatter(slug);
        if (!fm) continue;
        const related: string[] = Array.isArray(fm.relatedRoadmaps)
            ? fm.relatedRoadmaps.filter((r: string) =>
                availableSlugs.includes(r),
            )
            : [];
        // Quick topic count (try building tree cheaply)
        let topicCount = 0;
        const result = buildRoadmapTree(slug);
        if (result) topicCount = result.topicCount;
        map.set(slug, { title: fm.title ?? slug, topicCount, related });
    }
    return map;
}

// ---------------------------------------------------------------------------
// Graph expansion
// ---------------------------------------------------------------------------

/**
 * Recursively expand a roadmap slug into a GraphNode tree, following
 * relatedRoadmaps edges up to the given depth. A visited set prevents
 * infinite cycles.
 */
export function expandGraphNode(
    slug: string,
    relationsMap: Map<
        string,
        { title: string; topicCount: number; related: string[] }
    >,
    visited: Set<string>,
    currentDepth: number,
    maxDepthLimit: number,
): GraphNode {
    const info = relationsMap.get(slug)!;
    visited.add(slug);

    let children: GraphNode[] = [];
    if (currentDepth < maxDepthLimit) {
        for (const rel of info.related) {
            if (visited.has(rel)) continue;
            const relInfo = relationsMap.get(rel);
            if (!relInfo) continue;
            children.push(
                expandGraphNode(
                    rel,
                    relationsMap,
                    visited,
                    currentDepth + 1,
                    maxDepthLimit,
                ),
            );
        }
    }

    return {
        slug,
        title: info.title,
        topicCount: info.topicCount,
        relatedRoadmaps: info.related,
        children,
    };
}

// ---------------------------------------------------------------------------
// ASCII rendering
// ---------------------------------------------------------------------------

/**
 * Render a cross-roadmap graph as an ASCII tree.
 * Each node shows "Title (slug, N topics)".
 */
export function renderGraphAscii(nodes: GraphNode[], prefix = ''): string {
    const lines: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const isLast = i === nodes.length - 1;
        const connector = prefix === '' && nodes.length === 1 ? '' : isLast ? '└── ' : '├── ';
        const childPrefix = prefix === '' && nodes.length === 1 ? '' : isLast ? '    ' : '│   ';
        const label = `${node.title} (${node.slug}, ${node.topicCount} topics)`;
        lines.push(`${prefix}${connector}${label}`);
        if (node.children.length > 0) {
            lines.push(
                renderGraphAscii(node.children, prefix + childPrefix),
            );
        }
    }
    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON serialisation
// ---------------------------------------------------------------------------

/**
 * Strip children recursively for JSON output (keep only essential fields).
 */
export function toGraphJson(
    node: GraphNode,
): {
    slug: string;
    title: string;
    topicCount: number;
    relatedRoadmaps: string[];
    children: ReturnType<typeof toGraphJson>[];
} {
    return {
        slug: node.slug,
        title: node.title,
        topicCount: node.topicCount,
        relatedRoadmaps: node.relatedRoadmaps,
        children: node.children.map(toGraphJson),
    };
}
