/**
 * Shared type definitions for the export-roadmaps toolchain.
 */

// ---------------------------------------------------------------------------
// Roadmap tree node
// ---------------------------------------------------------------------------

export interface RoadmapNode {
    id: string;
    type: string;
    label: string;
    children: RoadmapNode[];
    contentFile?: string;
}

// ---------------------------------------------------------------------------
// Raw JSON data read from a roadmap's .json file
// ---------------------------------------------------------------------------

export interface RawJsonData {
    format: 'editor' | 'balsamiq' | 'stub';
    nodes?: any[];
    edges?: any[];
    controls?: any[];
}

// ---------------------------------------------------------------------------
// Cross-roadmap relationship graph node
// ---------------------------------------------------------------------------

export interface GraphNode {
    slug: string;
    title: string;
    topicCount: number;
    relatedRoadmaps: string[];
    children: GraphNode[];
}

// ---------------------------------------------------------------------------
// Hierarchy-only node (used for JSON output without id/contentFile noise)
// ---------------------------------------------------------------------------

export interface HierarchyNode {
    id: string;
    label: string;
    children: HierarchyNode[];
}
