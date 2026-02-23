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
- **Frontend:** Fully implemented (5 pages, Zustand state, localStorage persistence)
- **Backend:** Not yet implemented — Supabase SDK is installed (`@supabase/supabase-js`) but unused

### Key Layers

**`src/store/gameStore.ts`** — Single Zustand store managing all game state (XP, level, streaks, completed levels, achievements, modal visibility). Persists to `localStorage` key `neuroquest-game`. XP→Level formula: `level = floor(sqrt(xp / 100))`.

**`src/lib/gameData.ts`** — All static game content: 6 planets (each with 4–6 levels), quiz questions, arena challenges, achievements, and news items. This is the single source of truth for content until backend is wired.

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
