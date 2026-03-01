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

## Quiz Question Generation Pipeline

LLM-powered pipeline to generate quiz questions for any planet. Retrieves existing questions, sends them to the LLM as context, and generates harder ones. Before generating questions, the pipeline **auto-creates missing levels** in the `levels` table by calling the LLM to generate meaningful titles, and computes `xp_reward` using the formula: `150 + (level_number - 1) × 50`.

**API Endpoint:**
```bash
# Generate 5 new questions for the "prompt" planet
curl -X POST http://localhost:3000/api/quiz/generate \
  -H 'Content-Type: application/json' \
  -d '{"rollup":"prompt","count":5}'

# Generate 5 questions at uniform (same) difficulty
curl -X POST http://localhost:3000/api/quiz/generate \
  -H 'Content-Type: application/json' \
  -d '{"rollup":"prompt","count":5,"sameDifficulty":true}'

# Generate 3 questions × 4 difficulty levels (12 total, each level gets its own level_number)
curl -X POST http://localhost:3000/api/quiz/generate \
  -H 'Content-Type: application/json' \
  -d '{"rollup":"prompt","count":3,"levelCount":4}'
```

**CLI Script** (requires dev server running):
```bash
npx tsx scripts/generate-quiz.ts --rollup [rollup] --count [The number of questions you need to generate]
npx tsx scripts/generate-quiz.ts -r [rollup] -c [The number of questions you need to generate]
npx tsx scripts/generate-quiz.ts -r [rollup] -c [The number of questions you need to generate] --same-difficulty
npx tsx scripts/generate-quiz.ts -r [rollup] -c [The number of questions you need to generate] --level-count [The number of difficulty levels you need to generate]
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
- **Frontend:** Next.js Server & Client Components (shared in `src/components/`, page-specific co-located in `src/app/*/_components/`), Zustand state (`src/store/`), database-backed persistence.
- **Backend:** Next.js API Routes act as microservices. News system is powered by LLM ranking and generation.
- **Frontend Integration:** The Map assessment interface (`LevelModal`) has been significantly revised to adopt the **Kurzgesagt** style, featuring dynamic guide characters and high-impact vector aesthetics.
- **News Entry Point:** The news page is now accessed via the **Flame button** in the bottom navigation menu (next to the Map button).
- **Profile Integration:** The `ProfileSetupModal` handles operative calibration (background/interests) to set the `difficulty_score`.

### Library Directory (`src/lib/`)

Each module folder has a barrel `index.ts` for cleaner imports.

- **`db.ts`** — Singleton Prisma client.
- **`utils.ts`** — Generic frontend utilities (`cn` for Tailwind class merging).
- **`llm/`** — Shared LLM/OpenRouter client and generic helpers (`client.ts`, `helpers.ts`). Both news and quiz pipelines import from here.
- **`game/`** — Player domain helpers: XP/level calculations, streak logic (`helpers.ts`).
- **`news/`** — News cron pipeline: RSS feed fetching (`feeds.ts`), LLM article ranking (`ranker.ts`), question generation (`examiner.ts`), full-text scraping (`scraper.ts`), prompt templates (`prompts.ts`), date/title utilities (`utils.ts`), and feed list + model constants (`constants.ts`).
- **`quiz/`** — Quiz generation pipeline: core generator (`generator.ts`), prompt templates (`prompts.ts`), model constants (`constants.ts`).
- **`services/`** — Domain service layer for API route handlers. Each service encapsulates DB queries, DTO mapping, and business logic for its domain: `planet.service.ts`, `level.service.ts`, `achievement.service.ts`, `arena.service.ts`, `leaderboard.service.ts`, `quiz.service.ts`, `user.service.ts` (player + profile + options), `news.service.ts` (selections + scan-logs). Route handlers in `src/app/api/` delegate to these services.

### Shared Component Directory (`src/components/`)

Only truly shared (app-level) components live here. Page-specific components are co-located with their pages using `_components/` folders.

- **`effects/`** — Visual effects (`StarField`)
- **`icons/`** — Reusable SVG icon components (`Saturn`, `FomoBird`)
- **`layout/`** — App-level layout components (`BottomMenu`)
- **`providers/`** — App initialization wrappers (`GameInitializer`)

### Page-Specific Components (Co-located)

- **`src/app/_components/`** — Map page components: `BackgroundGraphics` (animated planet transitions), `DailyRewardModal`, `LevelModal`.
- **`src/app/news/_components/`** — News page components: `BackgroundGraphics` (static Kurzgesagt planets), `ProfileSetupModal`.

### Key Layers

**`src/app/api/news/cron/route.ts`** — System automated workflow that: (1) fetches RSS, (2) ranks articles via LLM, (3) generates questions via LLM.

**`src/app/news/page.tsx`** — Redesigned as an **Approachable Learning Hub**.

**`src/app/_components/LevelModal.tsx`** — Revised as a **Kurzgesagt-style Assessment Hub**:
- **Guide Character**: `FomoBird` (`src/components/icons/FomoBird.tsx`) — custom SVG bird with dynamic expressions (happy, thinking, surprised).
- **Visual Style**: Bold 4px borders, flat paper-cut shadows, and high-contrast space-themed colors.
- **Phases**: Intro briefing, multi-step neural probe (quiz), and mission extraction (result).


### Design System

CSS custom properties and utilities are defined in `src/app/globals.css`:
- **Color palette**: 
    - Core: NASA Blue `#1cb0f6`, Nuclear Green `#58cc02`, Terminal Black `#02040a`, Amber `#ffc800`.
    - Kurzgesagt: Space Indigo `#1D1C44`, Bird Yellow `#FFE100`, Sunset Orange `#FF7E5F`, Neon Cyan `#4EEAFF`.
- **Aesthetic**: **Kurzgesagt-inspired flat vector design** with high-impact typography (Inter/Orbitron).
- **Interaction**: Single-task focus, "Subtraction" principle, and spring-based physics for UI transitions.


Path alias `@/*` maps to `./src/*`.