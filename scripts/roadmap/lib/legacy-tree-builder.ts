/**
 * Legacy Balsamiq/mockup tree builder.
 *
 * Groups are identified by `__group__` controls whose `controlName`
 * uses a colon-separated path like `100-introduction:what-are-containers`.
 * The numeric prefix (e.g. `100`) is the sort order.
 */

import type { RoadmapNode } from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildLegacyTree(
    controls: any[],
    contentFiles: string[],
): { tree: RoadmapNode[]; topicCount: number } {
    // Collect all groups with their paths
    interface GroupEntry {
        path: string[];
        sortOrder: number;
        label: string;
    }

    const groups: GroupEntry[] = [];

    function collectGroups(controlList: any[]) {
        for (const ctrl of controlList) {
            if (ctrl.typeID !== '__group__') continue;
            const name: string = ctrl.properties?.controlName || '';
            const sortNum = parseInt(name.match(/^(\d+)/)?.[1] || '999', 10);
            const cleanName = name
                .replace(/^check:/, '')
                .replace(/^\d+-/, '');
            if (!cleanName) continue;

            const parts = cleanName.split(':');
            const label = parts[parts.length - 1]
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());

            groups.push({ path: parts, sortOrder: sortNum, label });

            // Recurse into children
            const children = ctrl.children?.controls?.control;
            if (Array.isArray(children) && children.length > 0) {
                collectGroups(children);
            }
        }
    }

    collectGroups(controls);

    // Build nested tree from paths
    interface TreeSlot {
        label: string;
        sortOrder: number;
        childMap: Map<string, TreeSlot>;
    }

    const root: TreeSlot = { label: '', sortOrder: 0, childMap: new Map() };

    for (const g of groups) {
        let current = root;
        for (const part of g.path) {
            if (!current.childMap.has(part)) {
                current.childMap.set(part, {
                    label: part
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase()),
                    sortOrder: 999,
                    childMap: new Map(),
                });
            }
            current = current.childMap.get(part)!;
        }
        current.label = g.label;
        current.sortOrder = g.sortOrder;
    }

    let topicCount = 0;

    function slotToNode(
        key: string,
        slot: TreeSlot,
        depth: number,
    ): RoadmapNode {
        const children = Array.from(slot.childMap.entries())
            .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
            .map(([k, s]) => slotToNode(k, s, depth + 1));

        topicCount++;

        const node: RoadmapNode = {
            id: key,
            type: depth === 0 ? 'topic' : 'subtopic',
            label: slot.label,
            children,
        };

        // Try to match a content file
        const matchFile = contentFiles.find(
            (f) => f.startsWith(key + '@') || f.startsWith(key + '.'),
        );
        if (matchFile) node.contentFile = matchFile;

        return node;
    }

    const tree = Array.from(root.childMap.entries())
        .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
        .map(([k, s]) => slotToNode(k, s, 0));

    return { tree, topicCount };
}
