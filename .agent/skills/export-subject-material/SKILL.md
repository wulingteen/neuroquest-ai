---
name: export-subject-material
description: get reference text from roadmaps. **ONLY use while there are trouble in npx --tree**.
---

## Your workflow

> All commands run from the **project root** (`neuroquest-ai/`). Dependencies are installed via the root `package.json`.

1. use `npm run tree -- {roadmap-name}` to show the stucture and relations between technique.

2. use `npm run tree -- {roadmap-name} "{children-name}"` to show the reference text that you are interested in.

## File Structure

```
scripts/roadmap/
├── export-roadmaps.ts        # CLI entry point (thin orchestrator)
├── lib/
│   ├── types.ts              # Shared interfaces (RoadmapNode, GraphNode, etc.)
│   ├── paths.ts              # Path constants (ROADMAPS_DIR, OUTPUT_DIR)
│   ├── cli.ts                # CLI argument parser
│   ├── yaml-frontmatter.ts   # Minimal YAML frontmatter parser (no deps)
│   ├── roadmap-io.ts         # File I/O helpers (read frontmatter/JSON/content)
│   ├── tree-builder.ts       # Editor-format (React-Flow) tree builder
│   ├── legacy-tree-builder.ts# Balsamiq/mockup-format tree builder
│   ├── tree-renderer.ts      # ASCII rendering, hierarchy conversion, label search
│   └── graph.ts              # Cross-roadmap relationship graph
└── output/                   # Generated JSON files

data/roadmaps/                # 81 roadmap assets
```

## COMMAND OVERVIEW

### View a single roadmap's hierarchy as an ASCII tree (also writes scripts/roadmap/output/<slug>.json)
npm run tree -- {roadmap-name}

### View as structured JSON (only labels + children)
npm run tree -- {roadmap-name} --json --pretty

### Save tree JSON to a file
npm run tree -- {roadmap-name} --json -o react-tree.json

### View content for a specific topic label (case-insensitive, substring match)
npm run tree -- {roadmap-name} "{label}"
npm run tree -- react "Vite"
npm run tree -- ai-agents "Gemini Function Calling"

### Cross-roadmap relationship graph

The `--graph` flag builds a tree of cross-roadmap relationships using the `relatedRoadmaps` field in each roadmap's frontmatter. JSON is always saved to `scripts/roadmap/output/`.

### Show relationship graph for a single roadmap (depth 1 = direct neighbours)
npm run graph -- {roadmap-name} --depth 1

### Show relationships between multiple roadmaps with unlimited depth
npm run graph -- {slug1} {slug2}

### Graph ALL roadmaps (saves to scripts/roadmap/output/roadmap-graph.json)
npm run graph -- --all

### JSON output
npm run graph -- {roadmap-name} --json --pretty
