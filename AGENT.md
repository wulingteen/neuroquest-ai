# AGENT.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000, uses Turbopack)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint (Next.js core-web-vitals + TypeScript rules)
```

No test runner is configured yet.

## Architecture

**NeuroQuest AI** is a gamified GenAI learning platform built as a Next.js 16 app with React 19, TypeScript, Tailwind CSS 4, and Zustand for state management.

### Frontend-Backend Status
- **Frontend:** Next.js Server & Client Components (`src/components/`, `src/app/` pages), Zustand state (`src/store/`), `localStorage` fallback persistence.
- **Backend:** Next.js API Routes (`src/app/api/...`) act as the controller layer, fetching data from PostgreSQL using the `postgres` library (`src/lib/db.ts`).
- **Database:** Local PostgreSQL instance managed via `docker-compose.yml`. Schema defined in `db/schema.sql`.
- **Frontend Integration:** All main pages (World Map, Arena, Lab, Leaderboard, Quiz) now fetch real-time data from the backend APIs.


### Key Layers

**`src/app/api/`** — Backend API routes. Handlers here (e.g., `src/app/api/planets/route.ts`) acts as our backend microservices ensuring clean separation from the UI.

**`src/lib/db.ts`** — PostgreSQL connection utility using the `postgres` JS library. It uses environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) for configuration, which should be set in a `.env` file.

**`src/lib/gameData.ts`** — TypeScript interfaces and shared game logic. Static data has been migrated to the database.

**`src/app/`** — Five pages using Next.js App Router:
- `/` — AI Universe Map (6 planets, progressive unlock at 70% completion)
- `/arena` — Prompt Arena (competitive prompt design + voting)
- `/lab` — Personal AI Lab (profile, AI pet, achievements gallery)
- `/leaderboard` — Global leaderboard with guilds
- `/news` — GenAI news with comprehension quizzes for XP

**`src/components/`** — Shared components: `NavBar` (player stats, XP bar, mobile bottom nav), `StarField` (canvas-based 200-star animated background), `DailyRewardModal`, `LevelModal` (quiz with confetti on completion).

### Design System

CSS custom properties and utilities are defined in `src/app/globals.css`:
- Color palette: neon blue `#00D4FF`, purple `#8B5CF6`, gold `#FFB800`, green `#10B981`, deep space bg `#0D0D2B`
- Fonts: Orbitron (headings) + Inter (body) via Google Fonts in `layout.tsx`
- Utility classes: `.glass-card`, `.neon-glow-*`, `.gradient-text`, `.btn-primary`, `.rarity-*`

Path alias `@/*` maps to `./src/*`.

## Adding New Content

- New quiz questions, planets, levels, or achievements → update the database schema in `db/schema.sql` and re-seed.
- New game state fields → extend the Zustand store in `src/store/gameStore.ts`.
- New backend functionality → add a route under `src/app/api/` and a database query in the handler.
- New pages → add under `src/app/[route]/page.tsx` and link from `NavBar.tsx`.
