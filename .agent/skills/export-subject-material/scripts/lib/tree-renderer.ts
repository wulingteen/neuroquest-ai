/**
 * Tree rendering, hierarchy conversion, label search, and high-level
 * tree-building orchestration.
 */

import type { RoadmapNode, HierarchyNode } from './types.js';
import { readFrontmatter, readJson, listContentFiles, readContentFile } from './roadmap-io.js';
import { buildTree } from './tree-builder.js';
import { buildLegacyTree } from './legacy-tree-builder.js';

// ---------------------------------------------------------------------------
// ASCII tree renderer
// ---------------------------------------------------------------------------

/**
 * Render a tree as an indented ASCII hierarchy.
 *
 *   React Developer
 *   ├── CLI Tools
 *   │   └── Vite
 *   ├── Components
 *   │   ├── Functional Components
 *   │   ├── JSX
 *   │   └── ...
 *   └── ...
 */
export function renderAsciiTree(tree: RoadmapNode[], prefix = ''): string {
    const lines: string[] = [];
    for (let i = 0; i < tree.length; i++) {
        const node = tree[i];
        const isLast = i === tree.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = isLast ? '    ' : '│   ';
        lines.push(`${prefix}${connector}${node.label}`);
        if (node.children.length > 0) {
            lines.push(
                renderAsciiTree(node.children, prefix + childPrefix),
            );
        }
    }
    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Hierarchy-only conversion (strips id/contentFile for clean JSON output)
// ---------------------------------------------------------------------------

/**
 * Strip content-file info, keeping only id + label + children hierarchy.
 */
export function toHierarchyNode(node: RoadmapNode): HierarchyNode {
    return {
        id: node.id,
        label: node.label,
        children: node.children.map(toHierarchyNode),
    };
}

// ---------------------------------------------------------------------------
// Label content lookup
// ---------------------------------------------------------------------------

/**
 * Recursively search the tree for nodes whose label matches the query
 * (case-insensitive exact match first, then substring).
 */
export function findNodesByLabel(
    tree: RoadmapNode[],
    query: string,
): RoadmapNode[] {
    const q = query.toLowerCase();
    const results: RoadmapNode[] = [];

    function walk(nodes: RoadmapNode[]) {
        for (const node of nodes) {
            if (node.label.toLowerCase() === q) {
                results.push(node);
            }
            walk(node.children);
        }
    }
    walk(tree);

    // If no exact match, try substring
    if (results.length === 0) {
        function walkSub(nodes: RoadmapNode[]) {
            for (const node of nodes) {
                if (node.label.toLowerCase().includes(q)) {
                    results.push(node);
                }
                walkSub(node.children);
            }
        }
        walkSub(tree);
    }

    return results;
}

// Re-export readContentFile for convenience in the entry point
export { readContentFile };

// ---------------------------------------------------------------------------
// High-level tree builder (orchestrates format detection + building)
// ---------------------------------------------------------------------------

/**
 * Build the full roadmap tree for a given slug, auto-detecting the
 * JSON format (editor / balsamiq / stub) and falling back to
 * content-file-derived flat lists.
 */
export function buildRoadmapTree(slug: string): {
    tree: RoadmapNode[];
    topicCount: number;
    frontmatter: Record<string, any>;
} | null {
    const frontmatter = readFrontmatter(slug);
    if (!frontmatter) {
        console.error(`⚠  Roadmap "${slug}" — no frontmatter .md file found`);
        return null;
    }

    const json = readJson(slug);
    const contentFiles = listContentFiles(slug);

    let tree: RoadmapNode[] = [];
    let topicCount = 0;

    if (json?.format === 'editor') {
        const result = buildTree(
            json.nodes || [],
            json.edges || [],
            contentFiles,
        );
        tree = result.tree;
        topicCount = result.topicCount;
    } else if (json?.format === 'balsamiq') {
        const result = buildLegacyTree(json.controls || [], contentFiles);
        tree = result.tree;
        topicCount = result.topicCount;
    } else {
        // No JSON or stub — derive a flat list from content files
        for (const f of contentFiles) {
            const m = f.match(/^(.+)@([^.]+)\.md$/);
            if (m) {
                tree.push({
                    id: m[2],
                    type: 'topic',
                    label: m[1]
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase()),
                    children: [],
                    contentFile: f,
                });
                topicCount++;
            }
        }
    }

    return { tree, topicCount, frontmatter };
}
