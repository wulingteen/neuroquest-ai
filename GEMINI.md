# GEMINI.md

**Database is running in Docker**

## Get news_article function

```
curl http://localhost:3000/api/news/cron
```

## View cron scan logs

```bash
# List recent scan runs
curl http://localhost:3000/api/news/scan-logs

# Detail for a specific run (includes per-feed logs)
curl http://localhost:3000/api/news/scan-logs?run_id=1
```

## Get news selections for the frontend

```bash
# Latest cycle_date (used by /news page)
curl http://localhost:3000/api/news/selections

# Specific date
curl http://localhost:3000/api/news/selections?date=2026-02-25

# Filter by max tier (user sees only tier ≤ maxTier)
curl http://localhost:3000/api/news/selections?maxTier=3
```

## Test test-rss-feeds

```
node scripts/test-rss-feeds.mjs
```

## Player Profile Setup

```bash
# Check if player has a profile
curl http://localhost:3000/api/user/profile

# Get all background/interest options
curl http://localhost:3000/api/user/profile/options

# Create/update player profile (computes difficulty_score 0-100)
curl -X POST http://localhost:3000/api/user/profile \
  -H 'Content-Type: application/json' \
  -d '{"background":"developer","interests":["prompt_eng","llm_fundamentals"]}'
```

## Database Schema Overview

The project uses a PostgreSQL database defined in `db/schema.sql`. Below is a concise overview of each table and its columns:

- **planets**: `planet_id` (INTEGER PK), `rollup` (TEXT UNIQUE), `label` (TEXT), `subtitle` (TEXT), `icon` (TEXT), `color` (TEXT), `glow_color` (TEXT), `bg_gradient` (TEXT), `x` (INTEGER), `y` (INTEGER), `description` (TEXT), `required_rollup` (TEXT FK), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- **levels**: `level_id` (INTEGER PK), `planet_id` (TEXT FK), `level_number` (INTEGER), `title` (TEXT), `content_type` (TEXT CHECK), `xp_reward` (INTEGER DEFAULT 0), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- **achievements**: `achievement_id` (TEXT PK), `name` (TEXT), `description` (TEXT), `icon` (TEXT), `rarity` (TEXT CHECK), `xp_reward` (INTEGER DEFAULT 0), `created_at` (TIMESTAMPTZ DEFAULT now()).
- **quiz_questions**: `question_id` (INTEGER GENERATED ALWAYS AS IDENTITY PK), `rollup` (TEXT FK), `level_id` (INTEGER FK), `question_number` (INTEGER NOT NULL, UNIQUE with level_id), `question_text` (TEXT), `options` (JSONB), `correct_option_index` (INTEGER), `explanation` (TEXT), `xp_reward` (INTEGER DEFAULT 0), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- **arena_challenges**: `challenge_id` (TEXT PK), `title` (TEXT), `description` (TEXT), `difficulty` (TEXT CHECK), `example_prompts` (JSONB), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- **players**: `player_id` (UUID PK DEFAULT gen_random_uuid()), `username` (TEXT UNIQUE), `email` (TEXT UNIQUE), `avatar` (TEXT), `xp` (INTEGER DEFAULT 0), `streak_days` (INTEGER DEFAULT 0), `guild_name` (TEXT), `last_login_at` (TIMESTAMPTZ), `last_reward_claimed_at` (TIMESTAMPTZ), `level` (INTEGER GENERATED ALWAYS AS (floor(xp / 1000) + 1) STORED), `created_at` (TIMESTAMPTZ DEFAULT now()).
- **player_progress**: `player_id` (UUID FK), `level_id` (INTEGER FK), `completed_at` (TIMESTAMPTZ DEFAULT now()), PRIMARY KEY (`player_id`, `level_id`).
- **rss_feeds**: Manages RSS source lists and fetch states.
- **news_articles**: Stores news articles parsed from RSS and fetched full contents.
- **news_selections**: AI-chosen articles split into 5 difficulty tiers (1–5, 3 articles each) per cycle date.
- **news_questions**: AI-generated reading comprehension questions based on `news_selections`.
- **player_news_answers**: Tracks player answers for news questions for rewards.
- **profile_options**: `option_id` (BIGINT PK), `category` (TEXT: 'background'|'interest'), `option_key` (TEXT), `label` (TEXT), `icon` (TEXT), `description` (TEXT), `score` (INTEGER 0-100), `sort_order` (INTEGER). Seed data: 7 backgrounds + 10 interests.
- **player_profiles**: `player_id` (UUID PK FK→players), `background` (TEXT), `interests` (TEXT[]), `difficulty_score` (INTEGER 0-100), `created_at`, `updated_at`. Score = 40% background_score + 60% avg(interest_scores).
- **cron_scan_runs**: `run_id` (BIGINT PK), `status` (TEXT: running/completed/failed), `total_feeds`, `feeds_ok`, `feeds_failed`, `articles_found`, `articles_selected`, `error_message`, `started_at`, `finished_at`. One row per cron invocation.
- **cron_scan_feed_logs**: `log_id` (BIGINT PK), `run_id` (FK), `feed_id` (FK), `feed_url`, `feed_name`, `status` (success/failed/skipped), `articles_found`, `error_message`, `duration_ms`, `created_at`. One row per feed per run.

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
- **Frontend:** Next.js Server & Client Components (`src/components/`, `src/app/` pages), Zustand state (`src/store/`), database-backed persistence.
- **Backend:** Next.js API Routes act as microservices. News system is powered by LLM ranking and generation.
- **Frontend Integration:** All main pages fetch real-time data. The News page (`/news`) has been redesigned with a **Duolingo-style** approachable interface, focused on singlend-task-at-a-time flows and English-only content.
- **News Entry Point:** The news page is now accessed via the **Flame button** in the bottom navigation menu (next to the Map button).
- **Profile Integration:** The `ProfileSetupModal` handles operative calibration (background/interests) to set the `difficulty_score`.

### Key Layers

**`src/app/api/news/cron/route.ts`** — System automated workflow that: (1) fetches RSS, (2) ranks articles via Gemini, (3) generates questions via Minimax.

**`src/app/news/page.tsx`** — Completely redesigned as an **Approachable Learning Hub**:
- **Hub View**: Large, friendly cards for daily stories.
- **Reading Phase**: Clean, distraction-free summary briefing.
- **Quiz Phase**: Duolingo-style one-question assessment with immediate feedback.
- **Completion Phase**: Reward display and level-up progress.

### Design System

CSS custom properties and utilities are defined in `src/app/globals.css`:
- Color palette: NASA Blue `#1cb0f6`, Nuclear Green `#58cc02`, Terminal Black `#02040a`, Amber `#ffc800`
- Aesthetic: Glassmorphism, grid-lines, high-impact typography (Inter/Orbitron).
- Interaction: Single-task focus, "Subtraction" principle.

Path alias `@/*` maps to `./src/*`.