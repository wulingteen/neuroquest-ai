# AGENT.md

**Database is running in Docker**

## Database Schema Overview

The project uses a PostgreSQL database defined in `db/schema.sql`. Below is a concise overview of each table and its columns:

- **planets**: `planet_id` (INTEGER PK), `rollup` (TEXT UNIQUE), `label` (TEXT), `subtitle` (TEXT), `icon` (TEXT), `color` (TEXT), `glow_color` (TEXT), `bg_gradient` (TEXT), `x` (INTEGER), `y` (INTEGER), `description` (TEXT), `required_rollup` (TEXT FK), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- **levels**: `level_id` (INTEGER PK), `planet_id` (TEXT FK), `level_number` (INTEGER), `title` (TEXT), `content_type` (TEXT CHECK), `xp_reward` (INTEGER DEFAULT 0), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- **achievements**: `achievement_id` (TEXT PK), `name` (TEXT), `description` (TEXT), `icon` (TEXT), `rarity` (TEXT CHECK), `xp_reward` (INTEGER DEFAULT 0), `created_at` (TIMESTAMPTZ DEFAULT now()).
- **quiz_questions**: `question_id` (INTEGER GENERATED ALWAYS AS IDENTITY PK), `rollup` (TEXT FK), `level_id` (INTEGER FK), `question_number` (INTEGER NOT NULL, UNIQUE with level_id), `question_text` (TEXT), `options` (JSONB), `correct_option_index` (INTEGER), `explanation` (TEXT), `xp_reward` (INTEGER DEFAULT 0), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- **arena_challenges**: `challenge_id` (TEXT PK), `title` (TEXT), `description` (TEXT), `difficulty` (TEXT CHECK), `example_prompts` (JSONB), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- **players**: `player_id` (UUID PK DEFAULT gen_random_uuid()), `username` (TEXT UNIQUE), `email` (TEXT UNIQUE), `avatar` (TEXT), `xp` (INTEGER DEFAULT 0), `streak_days` (INTEGER DEFAULT 0), `guild_name` (TEXT), `last_login_at` (TIMESTAMPTZ), `last_reward_claimed_at` (TIMESTAMPTZ), `level` (INTEGER GENERATED ALWAYS AS (floor(xp / 1000) + 1) STORED), `created_at` (TIMESTAMPTZ DEFAULT now()).
- **player_progress**: `player_id` (UUID FK), `level_id` (INTEGER FK), `completed_at` (TIMESTAMPTZ DEFAULT now()), PRIMARY KEY (`player_id`, `level_id`).

These tables support the core gameplay mechanics, including planet navigation, level progression, achievements, quizzes, arena challenges, and player tracking.

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
- **Frontend:** Next.js Server & Client Components (`src/components/`, `src/app/` pages), Zustand state (`src/store/`), database-backed persistence with `fetchUser` initialization.
- **Backend:** Next.js API Routes (`src/app/api/...`) act as the controller layer, fetching/updating data in PostgreSQL using `Prisma` (`src/lib/db.ts`).
- **Database:** Local PostgreSQL instance managed via `docker-compose.yml`. Schema defined in `db/schema.sql` and `prisma/schema.prisma`.
- **Frontend Integration:** All main pages (World Map, Arena, Lab, Leaderboard, Quiz) now fetch real-time data from the backend APIs. User profile and progress are synced with the `players` and `player_progress` tables.

### Key Layers

**`src/app/api/`** — Backend API routes. Handlers here (e.g., `src/app/api/user/route.ts` for profile, `src/app/api/planets/route.ts` which dynamically calculates levels) acts as our backend microservices ensuring clean separation from the UI.

**`src/lib/db.ts`** — PostgreSQL connection utility using the `postgres` JS library. It uses environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) for configuration, which should be set in a `.env` file.

**`src/lib/gameData.ts`** — TypeScript interfaces and shared game logic. Static data has been migrated to the database.

**`src/app/`** — Five pages using Next.js App Router:
- `/` — AI Universe Map (Vertical, Duolingo-style path layout, progressive level unlock)
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
