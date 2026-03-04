-- NeuroQuest AI - Optimized PostgreSQL Database Schema
-- Designed using postgresql-table-design skill

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Planets Table
-- Reference table for game regions/planets
CREATE TABLE IF NOT EXISTS planets (
    planet_id INTEGER PRIMARY KEY,
    rollup TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    subtitle TEXT,
    icon TEXT,
    color TEXT,
    glow_color TEXT,
    bg_gradient TEXT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    description TEXT,
    required_rollup TEXT REFERENCES planets(rollup) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for FK column (PostgreSQL doesn't auto-index FKs)
CREATE INDEX IF NOT EXISTS idx_planets_required_rollup ON planets(required_rollup);

-- 2. Levels Table
-- Game levels within planets
CREATE TABLE IF NOT EXISTS levels (
    level_id INTEGER PRIMARY KEY, -- changed to integer
    rollup TEXT NOT NULL REFERENCES planets(rollup) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('teach', 'quiz', 'boss')),
    xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (rollup, level_number) -- Ensure level numbers are unique within a planet
);

CREATE INDEX IF NOT EXISTS idx_levels_rollup ON levels(rollup);

-- 3. Achievements Table
-- Unlockable goals
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Quiz Questions Table
-- Questions pool
CREATE TABLE IF NOT EXISTS quiz_questions (
    question_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rollup TEXT NOT NULL REFERENCES planets(rollup) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array'), -- Validates options is a JSON array
    correct_option_index INTEGER NOT NULL CHECK (correct_option_index >= 0),
    explanation TEXT,
    xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (rollup, level_number, question_number),
    FOREIGN KEY (rollup, level_number) REFERENCES levels(rollup, level_number) ON DELETE CASCADE
);

-- GIN index for JSONB options if we ever need to search within them (e.g., finding questions with specific tags/options)
CREATE INDEX IF NOT EXISTS idx_quiz_questions_options_gin ON quiz_questions USING GIN (options);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_level_number ON quiz_questions(rollup, level_number);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_rollup ON quiz_questions(rollup);

-- 5. Arena Challenges Table
-- PvP or specialized challenges
CREATE TABLE IF NOT EXISTS arena_challenges (
    challenge_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    example_prompts JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(example_prompts) = 'array'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_challenges_difficulty ON arena_challenges(difficulty);

-- 6. Players Table (New, for future user management integration)
CREATE TABLE IF NOT EXISTS players (
    player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    avatar TEXT,
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    guild_name TEXT,
    last_login_at TIMESTAMPTZ,
    last_reward_claimed_at TIMESTAMPTZ,
    level INTEGER GENERATED ALWAYS AS (floor(xp / 1000) + 1) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_xp ON players(xp DESC);

-- 7. Player Progress Table (New, tracks completed levels)
CREATE TABLE IF NOT EXISTS player_progress (
    player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(level_id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, level_id)
);

-- 8. Profile Options Table
-- Predefined background and interest choices with difficulty scores
CREATE TABLE IF NOT EXISTS profile_options (
    option_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('background', 'interest')),
    option_key TEXT NOT NULL,
    label TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📌',
    description TEXT,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (category, option_key)
);

CREATE INDEX IF NOT EXISTS idx_profile_options_category ON profile_options(category);

-- 9. Player Profiles Table
-- Stores background, interests, and computed difficulty score
CREATE TABLE IF NOT EXISTS player_profiles (
    player_id UUID PRIMARY KEY REFERENCES players(player_id) ON DELETE CASCADE,
    background TEXT NOT NULL,
    interests TEXT[] NOT NULL DEFAULT '{}',
    difficulty_score INTEGER NOT NULL DEFAULT 50 CHECK (difficulty_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. RSS Feeds Table
-- Sources for daily news fetching
CREATE TABLE IF NOT EXISTS rss_feeds (
    feed_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rss_feeds_enabled ON rss_feeds(enabled) WHERE enabled = TRUE;

-- 10. LLM Configs Table
-- Model configuration for article selection and question generation
CREATE TABLE IF NOT EXISTS llm_configs (
    config_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role TEXT NOT NULL UNIQUE CHECK (role IN ('article_selector', 'question_generator')),
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    api_key_env_var TEXT NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(parameters) = 'object'),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. News Articles Table
-- Articles fetched from RSS feeds
CREATE TABLE IF NOT EXISTS news_articles (
    article_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    feed_id BIGINT NOT NULL REFERENCES rss_feeds(feed_id) ON DELETE CASCADE,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT,
    full_text TEXT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_articles_feed_id ON news_articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_fetched_at ON news_articles(fetched_at);

-- 12. News Selections Table
-- LLM-selected articles: 3 per difficulty tier (1-5) per cycle_date
CREATE TABLE IF NOT EXISTS news_selections (
    selection_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    article_id BIGINT NOT NULL REFERENCES news_articles(article_id) ON DELETE CASCADE,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
    cycle_date DATE NOT NULL,
    UNIQUE (article_id, tier, cycle_date)
);

CREATE INDEX IF NOT EXISTS idx_news_selections_tier_date ON news_selections(tier, cycle_date);

-- 13. News Questions Table
-- LLM-generated questions for selected articles (3 per article)
CREATE TABLE IF NOT EXISTS news_questions (
    question_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    selection_id BIGINT NOT NULL REFERENCES news_selections(selection_id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 3),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array'),
    correct_option_index INTEGER NOT NULL CHECK (correct_option_index BETWEEN 0 AND 3),
    explanation TEXT,
    xp_reward INTEGER NOT NULL DEFAULT 50 CHECK (xp_reward >= 0),
    UNIQUE (selection_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_news_questions_selection_id ON news_questions(selection_id);

-- 14. Player News Answers Table
-- One attempt per question per player; PK enforces single attempt
CREATE TABLE IF NOT EXISTS player_news_answers (
    player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES news_questions(question_id) ON DELETE CASCADE,
    selected_option_index INTEGER NOT NULL CHECK (selected_option_index BETWEEN 0 AND 3),
    is_correct BOOLEAN NOT NULL,
    xp_earned INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_player_news_answers_question_id ON player_news_answers(question_id);

-- 15. Cron Scan Runs Table
-- One row per cron invocation
CREATE TABLE IF NOT EXISTS cron_scan_runs (
    run_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status       TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    total_feeds  INTEGER NOT NULL DEFAULT 0,
    feeds_ok     INTEGER NOT NULL DEFAULT 0,
    feeds_failed INTEGER NOT NULL DEFAULT 0,
    articles_found   INTEGER NOT NULL DEFAULT 0,
    articles_selected INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cron_scan_runs_started_at ON cron_scan_runs(started_at DESC);

-- 16. Cron Scan Feed Logs Table
-- One row per feed per run
CREATE TABLE IF NOT EXISTS cron_scan_feed_logs (
    log_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id       BIGINT NOT NULL REFERENCES cron_scan_runs(run_id) ON DELETE CASCADE,
    feed_id      BIGINT NOT NULL REFERENCES rss_feeds(feed_id) ON DELETE CASCADE,
    feed_url     TEXT NOT NULL,
    feed_name    TEXT NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    articles_found INTEGER NOT NULL DEFAULT 0,
    error_message  TEXT,
    duration_ms    INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_scan_feed_logs_run_id ON cron_scan_feed_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_cron_scan_feed_logs_feed_id ON cron_scan_feed_logs(feed_id);
CREATE INDEX IF NOT EXISTS idx_cron_scan_feed_logs_status ON cron_scan_feed_logs(status) WHERE status = 'failed';

-- 17. Friends Table
CREATE TABLE IF NOT EXISTS friends (
    player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, friend_id),
    CHECK (player_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

-- 18. Friend Requests Table
-- Tracks pending/accepted/declined friend invitations (consent-based flow)
-- Once accepted the friends table is populated; the request row remains as audit trail.
CREATE TABLE IF NOT EXISTS friend_requests (
    request_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    requestee_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (requester_id <> requestee_id),
    UNIQUE (requester_id, requestee_id)
);

-- Inbox lookup: "show me all pending requests sent TO me"
CREATE INDEX IF NOT EXISTS idx_friend_requests_requestee_status
    ON friend_requests(requestee_id, status)
    WHERE status = 'pending';

-- Outbox dedup: "did I already send a request to this person?"
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester
    ON friend_requests(requester_id);

-- 19. Daily Top Messages Table
CREATE TABLE IF NOT EXISTS daily_top_messages (
    message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (length(message) <= 20),
    message_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (player_id, message_date)
);

-- Index the FK column (player_id) — PostgreSQL does not auto-index FK columns
CREATE INDEX IF NOT EXISTS idx_top_messages_player_id ON daily_top_messages(player_id);
CREATE INDEX IF NOT EXISTS idx_top_messages_date ON daily_top_messages(message_date);

-- NOTE: top_scorer_notifications was removed — daily_top_messages already encodes
-- the "notified/prompted today" semantic via its UNIQUE(player_id, message_date)
-- constraint. Keeping a second table for this was redundant and error-prone.

-- 19. Player Achievements Table
-- Junction table for players and achievements
CREATE TABLE IF NOT EXISTS player_achievements (
    player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, achievement_id)
);

-- Initial Data Migration

-- Planets
INSERT INTO planets (planet_id, rollup, label, subtitle, icon, color, glow_color, bg_gradient, x, y, description) VALUES
(1, 'prompt', 'Prompt Planet', 'Prompt Engineering', '⚡', '#8B5CF6', 'rgba(139,92,246,0.5)', 'from-purple-900 to-violet-950', 30, 40, 'Master the power of Prompts and make AI work for you'),
(2, 'model', 'Model Planet', 'LLM Fundamentals', '🧠', '#3B82F6', 'rgba(59,130,246,0.5)', 'from-blue-900 to-cyan-950', 62, 25, 'Dive into the core of Transformers and understand how AI thinks'),
(3, 'vision', 'Vision Planet', 'Multimodal AI', '👁️', '#F97316', 'rgba(249,115,22,0.5)', 'from-orange-900 to-red-950', 75, 58, 'See through the eyes of AI, exploring the fusion of images, sounds, and text'),
(4, 'ethics', 'Ethics Planet', 'AI Ethics', '⚖️', '#EF4444', 'rgba(239,68,68,0.5)', 'from-red-900 to-rose-950', 45, 70, 'Guard the boundaries of AI and become a responsible creator'),
(5, 'agent', 'Agent Planet', 'AI Agents', '🤖', '#10B981', 'rgba(16,185,129,0.5)', 'from-emerald-900 to-green-950', 18, 65, 'Unleash the potential of AI Agents and build autonomous intelligent systems'),
(6, 'future', 'Future Planet', 'AGI & Future Trends', '🌟', '#FFB800', 'rgba(255,184,0,0.5)', 'from-yellow-900 to-amber-950', 50, 48, 'Stay on the cutting edge and gain insights into the future of AI')
ON CONFLICT (planet_id) DO UPDATE SET
    rollup = EXCLUDED.rollup,
    label = EXCLUDED.label,
    subtitle = EXCLUDED.subtitle,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    glow_color = EXCLUDED.glow_color,
    bg_gradient = EXCLUDED.bg_gradient,
    x = EXCLUDED.x,
    y = EXCLUDED.y,
    description = EXCLUDED.description;

UPDATE planets SET required_rollup = 'prompt' WHERE rollup = 'model';
UPDATE planets SET required_rollup = 'model' WHERE rollup = 'vision';
UPDATE planets SET required_rollup = 'vision' WHERE rollup = 'ethics';
UPDATE planets SET required_rollup = 'ethics' WHERE rollup = 'agent';
UPDATE planets SET required_rollup = 'agent' WHERE rollup = 'future';

-- Levels
INSERT INTO levels (level_id, rollup, level_number, title, content_type, xp_reward) VALUES
(1, 'prompt', 1, 'What is a Prompt?', 'teach', 100),
(2, 'prompt', 2, 'Zero-shot vs Few-shot', 'quiz', 150),
(3, 'prompt', 3, 'Role-play Prompting', 'teach', 100),
(4, 'prompt', 4, 'Chain of Thought', 'quiz', 200),
(5, 'prompt', 5, 'Prompt Injection Defense', 'quiz', 200),
(6, 'prompt', 6, 'BOSS: Comprehensive Challenge', 'boss', 500),
(10, 'model', 1, 'What is an LLM?', 'teach', 150),
(11, 'model', 2, 'Transformer Architecture', 'quiz', 200),
(12, 'model', 3, 'Fine-tuning Techniques', 'boss', 400),
(13, 'vision', 1, 'Introduction to Multimodality', 'teach', 150),
(14, 'vision', 2, 'Image Generation Models', 'quiz', 250),
(15, 'ethics', 1, 'AI Bias and Fairness', 'teach', 150),
(16, 'ethics', 2, 'Copyright and Privacy', 'quiz', 200),
(17, 'ethics', 3, 'Responsible AI', 'boss', 400),
(18, 'agent', 1, 'What is an AI Agent?', 'teach', 200),
(19, 'agent', 2, 'Tool Use / Function Calling', 'quiz', 300),
(20, 'future', 1, 'AGI Concepts', 'teach', 250),
(21, 'future', 2, 'The Next Step of AI', 'quiz', 350)
ON CONFLICT (level_id) DO UPDATE SET
    rollup = EXCLUDED.rollup,
    level_number = EXCLUDED.level_number,
    title = EXCLUDED.title,
    content_type = EXCLUDED.content_type,
    xp_reward = EXCLUDED.xp_reward;

-- Achievements
INSERT INTO achievements (achievement_id, name, description, icon, rarity, xp_reward) VALUES
('first-step', 'Beginner', 'Complete your first level', '🌱', 'common', 50),
('prompt-master', 'Prompt Master', 'Complete all levels on Prompt Planet', '⚡', 'epic', 500),
('streak-7', 'Streak Pro', 'Log in for 7 consecutive days', '🔥', 'rare', 200),
('arena-winner', 'Arena Champion', 'Win first place in the Prompt Arena', '🏆', 'legendary', 1000),
('speed-run', 'Lightning Learner', 'Complete a level within 30 seconds', '⚡', 'rare', 300),
('perfect', 'Perfectionist', 'Complete a chapter without any mistakes', '💎', 'epic', 400)
ON CONFLICT (achievement_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    rarity = EXCLUDED.rarity,
    xp_reward = EXCLUDED.xp_reward;

-- Quiz Questions
INSERT INTO quiz_questions (rollup, level_number, question_number, question_text, options, correct_option_index, explanation, xp_reward) VALUES
('prompt', 1, 1, 'Which of the following Prompt techniques is best suited for tasks requiring AI to perform step-by-step reasoning?', '["Zero-shot Prompting", "Chain of Thought (CoT) Prompting", "One-shot Prompting", "Temperature Adjustment"]', 1, 'Chain of Thought Prompting allows the AI to show its reasoning steps, making it particularly suitable for tasks requiring multi-step reasoning like math and logic.', 150),
('prompt', 2, 2, 'What concept does "Token" in an LLM most closely represent?', '["A complete word", "The smallest unit of text processing (about 3-4 characters)", "A complete sentence", "A block of code"]', 1, 'A Token is the smallest unit an LLM uses to process text. In English, it is about 4 characters; in Chinese, each character is usually 1-2 Tokens.', 150),
('prompt', 3, 1, 'In an LLM''s Temperature parameter, what effect does a value close to 0 have?', '["More creative and diverse output", "More random and unpredictable responses", "More deterministic and conservative output", "Faster response speed"]', 2, 'When Temperature is close to 0, the model tends to choose the most probable Tokens, making the output more deterministic and consistent; close to 1 makes it more creative and diverse.', 200),
('prompt', 4, 1, 'Which of the following statements about RAG (Retrieval-Augmented Generation) is correct?', '["RAG permanently modifies LLM parameters", "RAG dynamically retrieves from an external knowledge base during inference", "RAG requires more training data than Fine-tuning", "RAG only applies to image generation"]', 1, 'RAG retrieves relevant information from an external knowledge base in real-time when generating responses, without modifying the model itself, making it suitable for scenarios needing up-to-date information.', 200),
('prompt', 5, 1, 'Which of the following statements about RAG (Retrieval-Augmented Generation) is correct?', '["RAG permanently modifies LLM parameters", "RAG dynamically retrieves from an external knowledge base during inference", "RAG requires more training data than Fine-tuning", "RAG only applies to image generation"]', 1, 'RAG retrieves relevant information from an external knowledge base in real-time when generating responses, without modifying the model itself, making it suitable for scenarios needing up-to-date information.', 200),
('prompt', 6, 1, 'Which of the following statements about RAG (Retrieval-Augmented Generation) is correct?', '["RAG permanently modifies LLM parameters", "RAG dynamically retrieves from an external knowledge base during inference", "RAG requires more training data than Fine-tuning", "RAG only applies to image generation"]', 1, 'RAG retrieves relevant information from an external knowledge base in real-time when generating responses, without modifying the model itself, making it suitable for scenarios needing up-to-date information.', 200),
('model', 1, 1, 'Which core mechanism of the Transformer model allows it to handle dependencies in long texts?', '["Self-Attention mechanism", "Convolutional layer (Convolution)", "Recurrent Neural Network (RNN)", "Pooling layer (Pooling)"]', 0, 'Self-Attention allows the model to focus on other words in a sequence while processing a single word, thereby understanding long-distance dependencies.', 200),
('model', 2, 1, 'Which of the following fine-tuning methods can adjust large models while significantly reducing computational resources?', '["Full Fine-tuning", "LoRA (Low-Rank Adaptation)", "Pre-training", "RAG"]', 1, 'LoRA is a Parameter-Efficient Fine-Tuning (PEFT) method that updates parameters by adding low-rank matrices alongside the model''s weight matrices, significantly saving resources.', 400),
('model', 3, 1, 'Which of the following fine-tuning methods can adjust large models while significantly reducing computational resources?', '["Full Fine-tuning", "LoRA (Low-Rank Adaptation)", "Pre-training", "RAG"]', 1, 'LoRA is a Parameter-Efficient Fine-Tuning (PEFT) method that updates parameters by adding low-rank matrices alongside the model''s weight matrices, significantly saving resources.', 400),
('vision', 1, 1, 'What technical architecture are Midjourney and Stable Diffusion primarily based on?', '["GAN (Generative Adversarial Network)", "Diffusion Model", "RNN", "CNN"]', 1, 'Diffusion Models are currently the mainstream image generation technology, generating high-quality images by learning a denoising process.', 250),
('vision', 2, 1, 'What technical architecture are Midjourney and Stable Diffusion primarily based on?', '["GAN (Generative Adversarial Network)", "Diffusion Model", "RNN", "CNN"]', 1, 'Diffusion Models are currently the mainstream image generation technology, generating high-quality images by learning a denoising process.', 250),
('ethics', 1, 1, 'If an AI model is trained using copyrighted material, what is the primary legal controversy it faces?', '["Violating model safety protocols", "The boundary between Fair Use and infringement", "The model will become slower", "Conflicts in open-source agreements"]', 1, 'Whether AI training data constitutes "Fair Use" is currently a major controversy in copyright law, involving creator rights and technological development.', 200),
('ethics', 2, 1, 'If an AI model is trained using copyrighted material, what is the primary legal controversy it faces?', '["Violating model safety protocols", "The boundary between Fair Use and infringement", "The model will become slower", "Conflicts in open-source agreements"]', 1, 'Whether AI training data constitutes "Fair Use" is currently a major controversy in copyright law, involving creator rights and technological development.', 200),
('ethics', 3, 1, 'Which of the following is one of the core principles when developing "Responsible AI"?', '["Increasing parameters as much as possible", "Ensuring transparency and explainability", "Complete automation without human review", "Pursuing highest accuracy while ignoring bias"]', 1, 'Transparency and explainability are benchmarks for Responsible AI, allowing users and developers to understand the AI''s decision-making process and trace potential errors.', 400),
('agent', 1, 1, 'When an AI Agent needs to obtain real-time weather information, what key capability does it rely on?', '["Increasing Temperature", "Tool Use / Function Calling", "Changing Prompt style", "Zero-shot reasoning"]', 1, 'Tool Use (or Function Calling) empowers an Agent to execute external APIs or scripts, enabling it to obtain real-time data.', 300),
('agent', 2, 1, 'When an AI Agent needs to obtain real-time weather information, what key capability does it rely on?', '["Increasing Temperature", "Tool Use / Function Calling", "Changing Prompt style", "Zero-shot reasoning"]', 1, 'Tool Use (or Function Calling) empowers an Agent to execute external APIs or scripts, enabling it to obtain real-time data.', 300),
('future', 1, 1, 'Which statement regarding AGI (Artificial General Intelligence) is the most accurate?', '["AGI refers to expert systems capable of only a single task", "AGI can reach or exceed human levels in any intellectual task", "Current ChatGPT is already a perfect AGI", "AGI just refers to a significant increase in computer power"]', 1, 'AGI is a hypothetical artificial intelligence that can demonstrate abilities comparable to or exceeding humans in a wide range of cognitive tasks.', 350),
('future', 2, 1, 'Which statement regarding AGI (Artificial General Intelligence) is the most accurate?', '["AGI refers to expert systems capable of only a single task", "AGI can reach or exceed human levels in any intellectual task", "Current ChatGPT is already a perfect AGI", "AGI just refers to a significant increase in computer power"]', 1, 'AGI is a hypothetical artificial intelligence that can demonstrate abilities comparable to or exceeding humans in a wide range of cognitive tasks.', 350)
ON CONFLICT (rollup, level_number, question_number) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option_index = EXCLUDED.correct_option_index,
    explanation = EXCLUDED.explanation,
    xp_reward = EXCLUDED.xp_reward;

-- Arena Challenges
INSERT INTO arena_challenges (challenge_id, title, description, difficulty, example_prompts) VALUES
('a1', 'Poetic Chef', 'Use a Prompt to make the AI describe a "Scrambled Eggs with Tomato" recipe in a poetic way', 'easy', '["Add rhyming requirements", "Specify poetic style", "Limit word count"]'),
('a2', 'Science Explainer', 'Have the AI explain "what a black hole is" in language a 5-year-old can understand', 'medium', '["Analogize to everyday objects", "Avoid technical jargon", "Add fun metaphors"]'),
('a3', 'Wise Debater', 'Design a Prompt to make the AI provide arguments both for and against "AI replacing engineers"', 'hard', '["Balance both perspectives", "Cite specific examples", "Provide concluding suggestions"]')
ON CONFLICT (challenge_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    difficulty = EXCLUDED.difficulty,
    example_prompts = EXCLUDED.example_prompts;

-- Profile Options (Background + Interest choices with scores)
INSERT INTO profile_options (category, option_key, label, icon, description, score, sort_order) VALUES
-- Backgrounds (score reflects AI/tech familiarity)
('background', 'student',     'Student',    '🎓', 'A student currently studying and interested in AI', 20, 1),
('background', 'creative',    'Creator',    '🎨', 'Designer, artist, or content creator', 30, 2),
('background', 'business',    'Professional','💼', 'Manager, marketing, or business professional', 35, 3),
('background', 'educator',    'Educator',   '📚', 'Teacher, lecturer, or education practitioner', 45, 4),
('background', 'developer',   'Developer',  '💻', 'Software engineer or developer', 70, 5),
('background', 'data_pro',    'Data Pro',   '📊', 'Data scientist, analyst, or ML engineer', 80, 6),
('background', 'researcher',  'AI Researcher','🔬', 'Engaged in AI/ML-related academic research', 90, 7)
ON CONFLICT (category, option_key) DO UPDATE SET
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    score = EXCLUDED.score,
    sort_order = EXCLUDED.sort_order;

INSERT INTO profile_options (category, option_key, label, icon, description, score, sort_order) VALUES
-- Interests (score reflects topic complexity)
('interest', 'ai_art',           'AI Art & Creation',  '🖼️', 'Generate images, music, and videos with AI', 15, 1),
('interest', 'chatbot',          'Chatbot Apps',       '💬', 'Daily use of AI like ChatGPT and Claude', 20, 2),
('interest', 'ai_productivity',  'AI Productivity',    '⚡', 'AI writing assistants, coding aids, and automation tools', 30, 3),
('interest', 'ai_ethics',        'AI Ethics & Society','⚖️', 'Issues like AI bias, privacy, and copyright', 35, 4),
('interest', 'prompt_eng',       'Prompt Engineering', '✍️', 'How to write effective AI prompts', 40, 5),
('interest', 'ai_business',      'AI Business',        '📈', 'Enterprise AI, business strategies, and industry trends', 45, 6),
('interest', 'computer_vision',  'Computer Vision',    '👁️', 'Image recognition, video analysis, and multimodality', 60, 7),
('interest', 'nlp',              'NLP',                '📝', 'Text understanding, translation, and semantic analysis', 65, 8),
('interest', 'llm_fundamentals', 'LLM Fundamentals',   '🧠', 'Core concepts like Transformer and fine-tuning', 80, 9),
('interest', 'ai_agents',        'AI Agents & Automation', '🤖', 'Autonomous systems, Tool Use, and ReAct technology', 90, 10)
ON CONFLICT (category, option_key) DO UPDATE SET
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    score = EXCLUDED.score,
    sort_order = EXCLUDED.sort_order;

-- Dummy Players and Progress for Testing
INSERT INTO players (username, xp, streak_days, guild_name) VALUES
('NeuralNinja', 8000, 32, 'AI Pioneers'),
('PromptPhysicist', 2000, 15, 'Deep Minds'),
('TokenWizard', 1000, 28, 'AI Pioneers'),
('LLMSurfer', 6500, 7, 'Prompt Lords'),
('VectorQueen', 9800, 21, 'Deep Minds'),
('EmbeddingElf', 2600, 5, NULL),
('RAGRunner', 2210, 12, 'Prompt Lords'),
('AttentionAce', 1980, 3, NULL),
('AgentAlpha', 7200, 9, 'AI Pioneers'),
('YouPlayer', 50000, 4, 'Beginner Village')
ON CONFLICT (username) DO NOTHING;

-- Initial Progress for YouPlayer
INSERT INTO player_progress (player_id, level_id)
SELECT p.player_id, l.level_id
FROM players p, levels l
WHERE p.username = 'YouPlayer' AND l.level_id IN (1, 2, 3)
ON CONFLICT (player_id, level_id) DO NOTHING;

-- Seed Friends for YouPlayer
INSERT INTO friends (player_id, friend_id)
SELECT p1.player_id, p2.player_id
FROM players p1, players p2
WHERE p1.username = 'YouPlayer' AND p2.username IN ('NeuralNinja', 'PromptPhysicist', 'TokenWizard')
ON CONFLICT DO NOTHING;

INSERT INTO friends (player_id, friend_id)
SELECT p1.player_id, p2.player_id
FROM players p1, players p2
WHERE p2.username = 'YouPlayer' AND p1.username IN ('NeuralNinja', 'PromptPhysicist', 'TokenWizard')
ON CONFLICT DO NOTHING;
