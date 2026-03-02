/**
 * Editor-format tree builder.
 *
 * Constructs a topic→subtopic tree from the nodes + edges JSON
 * produced by the React-Flow-based roadmap editor.
 *
 * Parent-child resolution:
 *   1. Direct edges from topic → subtopic
 *   2. Spatial containment: subtopics inside section containers are
 *      assigned to the nearest topic that is AT OR ABOVE the section top
 *   3. Fallback: nearest topic by proximity for any remaining orphans
 */

import type { RoadmapNode } from './types.js';

// ---------------------------------------------------------------------------
// Spatial helpers
// ---------------------------------------------------------------------------

const getPos = (n: any) => ({
    x: n.position?.x ?? n.positionAbsolute?.x ?? 0,
    y: n.position?.y ?? n.positionAbsolute?.y ?? 0,
});

const getSize = (n: any) => ({
    w: n.width ?? n.style?.width ?? n.measured?.width ?? 0,
    h: n.height ?? n.style?.height ?? n.measured?.height ?? 0,
});

const contains = (container: any, child: any) => {
    const cp = getPos(container);
    const cs = getSize(container);
    const np = getPos(child);
    return (
        np.x >= cp.x &&
        np.x <= cp.x + cs.w &&
        np.y >= cp.y &&
        np.y <= cp.y + cs.h
    );
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildTree(
    nodes: any[],
    edges: any[],
    contentFiles: string[],
): { tree: RoadmapNode[]; topicCount: number } {
    const nodeById = new Map<string, any>();
    for (const n of nodes) nodeById.set(n.id, n);

    // Content file lookup: nodeId → filename
    const contentByNodeId = new Map<string, string>();
    for (const f of contentFiles) {
        const m = f.match(/@([^.]+)\.md$/);
        if (m) contentByNodeId.set(m[1], f);
    }

    const topics = nodes.filter((n) => n.type === 'topic');
    const subtopics = nodes.filter((n) => n.type === 'subtopic');
    const sections = nodes.filter((n) => n.type === 'section');

    // ---- Step 1: direct edge-based parent assignment ----
    const parentOf = new Map<string, string>(); // subtopicId → topicId

    for (const edge of edges) {
        const src = nodeById.get(edge.source);
        const tgt = nodeById.get(edge.target);
        if (!src || !tgt) continue;
        if (src.type === 'topic' && tgt.type === 'subtopic') {
            parentOf.set(tgt.id, src.id);
        }
    }

    // ---- Step 2: section-based spatial containment ----
    for (const sec of sections) {
        const containedSubs = subtopics.filter(
            (st) => !parentOf.has(st.id) && contains(sec, st),
        );
        if (containedSubs.length === 0) continue;

        const secTopY = getPos(sec).y;
        const secCenterX = getPos(sec).x + getSize(sec).w / 2;

        let bestTopic: any = null;
        let bestDist = Infinity;
        for (const t of topics) {
            const tp = getPos(t);
            if (tp.y > secTopY + 10) continue; // must be above section
            const yDist = secTopY - tp.y;
            const xDist = Math.abs(tp.x - secCenterX);
            const dist = yDist + xDist * 0.5;
            if (dist < bestDist) {
                bestDist = dist;
                bestTopic = t;
            }
        }

        if (bestTopic) {
            for (const st of containedSubs) {
                parentOf.set(st.id, bestTopic.id);
            }
        }
    }

    // ---- Step 3: fallback — nearest topic by proximity ----
    for (const st of subtopics) {
        if (parentOf.has(st.id)) continue;
        const sp = getPos(st);
        let minDist = Infinity;
        let nearest: any = null;
        for (const t of topics) {
            const tp = getPos(t);
            const dist =
                Math.abs(tp.y - sp.y) + Math.abs(tp.x - sp.x) * 0.1;
            if (dist < minDist) {
                minDist = dist;
                nearest = t;
            }
        }
        if (nearest) parentOf.set(st.id, nearest.id);
    }

    // ---- Step 4: topic ordering via edge spine ----
    const topicNext = new Map<string, string>();
    const topicHasIncoming = new Set<string>();
    for (const edge of edges) {
        const src = nodeById.get(edge.source);
        const tgt = nodeById.get(edge.target);
        if (!src || !tgt) continue;
        if (src.type === 'topic' && tgt.type === 'topic') {
            topicNext.set(src.id, tgt.id);
            topicHasIncoming.add(tgt.id);
        }
    }

    const orderedTopics: any[] = [];
    const visited = new Set<string>();

    const chainStarts = topics
        .filter((t) => !topicHasIncoming.has(t.id))
        .sort((a: any, b: any) => getPos(a).y - getPos(b).y);

    for (const start of chainStarts) {
        let cur: any = start;
        while (cur && !visited.has(cur.id)) {
            visited.add(cur.id);
            orderedTopics.push(cur);
            const nextId = topicNext.get(cur.id);
            cur = nextId ? nodeById.get(nextId) : null;
        }
    }

    // Add unvisited topics
    topics
        .filter((t) => !visited.has(t.id))
        .sort((a: any, b: any) => getPos(a).y - getPos(b).y)
        .forEach((t) => orderedTopics.push(t));

    // ---- Step 5: children lists ----
    const childrenMap = new Map<string, any[]>();
    for (const st of subtopics) {
        const pid = parentOf.get(st.id);
        if (pid) {
            if (!childrenMap.has(pid)) childrenMap.set(pid, []);
            childrenMap.get(pid)!.push(st);
        }
    }

    // Sort children top-to-bottom, left-to-right
    for (const [, children] of childrenMap) {
        children.sort((a: any, b: any) => {
            const dy = getPos(a).y - getPos(b).y;
            return dy !== 0 ? dy : getPos(a).x - getPos(b).x;
        });
    }

    // ---- Step 6: export format ----
    const toExportNode = (n: any): RoadmapNode => {
        const children = (childrenMap.get(n.id) || []).map(toExportNode);
        const result: RoadmapNode = {
            id: n.id,
            type: n.type,
            label: n.data?.label ?? '',
            children,
        };
        const cf = contentByNodeId.get(n.id);
        if (cf) result.contentFile = cf;
        return result;
    };

    const tree = orderedTopics.map(toExportNode);

    let topicCount = 0;
    const count = (nodes: RoadmapNode[]) => {
        for (const n of nodes) {
            topicCount++;
            count(n.children);
        }
    };
    count(tree);

    return { tree, topicCount };
}
