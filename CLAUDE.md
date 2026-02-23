# CLAUDE.md

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
- **Backend:** Setup started using Next.js API Routes (`src/app/api/...`) as the dedicated backend controller layer, ensuring strict frontend-backend separation within this monorepo.
- **Database:** Supabase tools setup in `src/lib/supabase/`. For testing, a local PostgreSQL instance is provided via `docker-compose.yml` with a schema in `db/schema.sql`. Initial game data is migrated into this local instance.
- **Local DB:** Use `docker-compose up -d` to start the PostgreSQL instance on port 5433.


### Key Layers

**`src/app/api/`** — Backend API routes. Handlers here (e.g., `src/app/api/planets/route.ts`) acts as our backend microservices ensuring clean separation from the UI.

**`src/lib/supabase/`** — Database clients (`client.ts` and `server.ts`) implementing SSR best practices with `@supabase/ssr`.

**`src/types/`** — Shared TypeScript models (e.g., `game.ts`) between frontend boundaries and backend logic.

**`src/store/gameStore.ts`** — Single Zustand store managing all game state (XP, level, streaks, completed levels, achievements, modal visibility). Persists to `localStorage` key `neuroquest-game`. XP→Level formula: `level = floor(sqrt(xp / 100))`.

**`src/lib/gameData.ts`** — Current static fallback data until Supabase remote fetches are fully piped.

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

- New quiz questions, planets, levels, or news → edit `src/lib/gameData.ts`
- New game state fields → extend the Zustand store in `src/store/gameStore.ts`
- New pages → add under `src/app/[route]/page.tsx` and link from `NavBar.tsx`
