/**
 * File I/O helpers for reading roadmap assets from disk.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROADMAPS_DIR } from './paths.js';
import { parseFrontmatter } from './yaml-frontmatter.js';
import type { RawJsonData } from './types.js';

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

/**
 * Read and parse the YAML frontmatter from <slug>/<slug>.md.
 */
export function readFrontmatter(slug: string): Record<string, any> | null {
    const mdPath = path.join(ROADMAPS_DIR, slug, `${slug}.md`);
    if (!fs.existsSync(mdPath)) return null;
    return parseFrontmatter(fs.readFileSync(mdPath, 'utf-8'));
}

// ---------------------------------------------------------------------------
// JSON graph data
// ---------------------------------------------------------------------------

/**
 * Read the roadmap JSON file and classify its format.
 */
export function readJson(slug: string): RawJsonData | null {
    const jsonPath = path.join(ROADMAPS_DIR, slug, `${slug}.json`);
    if (!fs.existsSync(jsonPath)) return null;
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    // Editor format: { nodes: [...], edges: [...] }
    if (Array.isArray(raw.nodes)) {
        // Stub: JSON exists but only has decorative nodes (no topics/subtopics)
        const hasContent = raw.nodes.some(
            (n: any) => n.type === 'topic' || n.type === 'subtopic',
        );
        if (!hasContent) return { format: 'stub' };
        return { format: 'editor', nodes: raw.nodes, edges: raw.edges || [] };
    }

    // Legacy Balsamiq/mockup format: { mockup: { controls: { control: [...] } } }
    if (raw.mockup?.controls?.control) {
        return { format: 'balsamiq', controls: raw.mockup.controls.control };
    }

    return { format: 'stub' };
}

// ---------------------------------------------------------------------------
// Content files
// ---------------------------------------------------------------------------

/**
 * List all `.md` content files for a roadmap.
 */
export function listContentFiles(slug: string): string[] {
    const contentDir = path.join(ROADMAPS_DIR, slug, 'content');
    if (!fs.existsSync(contentDir)) return [];
    return fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'));
}

/**
 * Read the content file for a node and return its text.
 */
export function readContentFile(slug: string, filename: string): string | null {
    const filePath = path.join(ROADMAPS_DIR, slug, 'content', filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
}

// ---------------------------------------------------------------------------
// Slug enumeration
// ---------------------------------------------------------------------------

/**
 * List all available roadmap slugs (directories under ROADMAPS_DIR), sorted.
 */
export function listAllSlugs(): string[] {
    return fs
        .readdirSync(ROADMAPS_DIR)
        .filter((f) => fs.statSync(path.join(ROADMAPS_DIR, f)).isDirectory())
        .sort();
}
