-- NeuroQuest AI - Optimized PostgreSQL Database Schema
-- Designed using postgresql-table-design skill

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Planets Table
-- Reference table for game regions/planets
CREATE TABLE IF NOT EXISTS planets (
    planet_id TEXT PRIMARY KEY, -- Using TEXT as ID for human-readable references as per original design
    name TEXT NOT NULL,
    subtitle TEXT,
    icon TEXT,
    color TEXT,
    glow_color TEXT,
    bg_gradient TEXT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    total_levels INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    locked BOOLEAN NOT NULL DEFAULT TRUE,
    required_planet_id TEXT REFERENCES planets(planet_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for FK column (PostgreSQL doesn't auto-index FKs)
CREATE INDEX IF NOT EXISTS idx_planets_required_planet_id ON planets(required_planet_id);

-- 2. Levels Table
-- Game levels within planets
CREATE TABLE IF NOT EXISTS levels (
    level_id INTEGER PRIMARY KEY, -- changed to integer
    planet_id TEXT NOT NULL REFERENCES planets(planet_id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('teach', 'quiz', 'boss')),
    xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (planet_id, level_number) -- Ensure level numbers are unique within a planet
);

CREATE INDEX IF NOT EXISTS idx_levels_planet_id ON levels(planet_id);

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
    level_id INTEGER REFERENCES levels(level_id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array'), -- Validates options is a JSON array
    correct_option_index INTEGER NOT NULL CHECK (correct_option_index >= 0),
    explanation TEXT,
    xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (level_id, question_number)
);

-- GIN index for JSONB options if we ever need to search within them (e.g., finding questions with specific tags/options)
CREATE INDEX IF NOT EXISTS idx_quiz_questions_options_gin ON quiz_questions USING GIN (options);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_level_id ON quiz_questions(level_id);

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

-- Initial Data Migration

-- Planets
INSERT INTO planets (planet_id, name, subtitle, icon, color, glow_color, bg_gradient, x, y, total_levels, description, locked) VALUES
('prompt', 'Prompt 星', 'Prompt Engineering', '⚡', '#8B5CF6', 'rgba(139,92,246,0.5)', 'from-purple-900 to-violet-950', 30, 40, 6, '掌握 Prompt 的力量，讓 AI 為你所用', false),
('model', 'Model 星', 'LLM 模型原理', '🧠', '#3B82F6', 'rgba(59,130,246,0.5)', 'from-blue-900 to-cyan-950', 62, 25, 6, '深入 Transformer 的核心，理解 AI 如何思考', true),
('vision', 'Vision 星', '多模態 AI', '👁️', '#F97316', 'rgba(249,115,22,0.5)', 'from-orange-900 to-red-950', 75, 58, 5, '看見 AI 的眼睛，探索圖像、聲音與文字的融合', true),
('ethics', 'Ethics 星', 'AI 倫理', '⚖️', '#EF4444', 'rgba(239,68,68,0.5)', 'from-red-900 to-rose-950', 45, 70, 5, '守護 AI 的邊界，成為負責任的創造者', true),
('agent', 'Agent 星', 'AI Agents', '🤖', '#10B981', 'rgba(16,185,129,0.5)', 'from-emerald-900 to-green-950', 18, 65, 5, '釋放 AI Agent 的潛力，打造自主智能系統', true),
('future', 'Future 星', 'AGI & 未來趨勢', '🌟', '#FFB800', 'rgba(255,184,0,0.5)', 'from-yellow-900 to-amber-950', 50, 48, 4, '站在時代浪尖，洞察 AI 的未來', true)
ON CONFLICT (planet_id) DO UPDATE SET
    name = EXCLUDED.name,
    subtitle = EXCLUDED.subtitle,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    glow_color = EXCLUDED.glow_color,
    bg_gradient = EXCLUDED.bg_gradient,
    x = EXCLUDED.x,
    y = EXCLUDED.y,
    total_levels = EXCLUDED.total_levels,
    description = EXCLUDED.description,
    locked = EXCLUDED.locked;

UPDATE planets SET required_planet_id = 'prompt' WHERE planet_id = 'model';
UPDATE planets SET required_planet_id = 'model' WHERE planet_id = 'vision';
UPDATE planets SET required_planet_id = 'vision' WHERE planet_id = 'ethics';
UPDATE planets SET required_planet_id = 'ethics' WHERE planet_id = 'agent';
UPDATE planets SET required_planet_id = 'agent' WHERE planet_id = 'future';

-- Levels
INSERT INTO levels (level_id, planet_id, level_number, title, content_type, xp_reward) VALUES
(1, 'prompt', 1, '什麼是 Prompt？', 'teach', 100),
(2, 'prompt', 2, 'Zero-shot vs Few-shot', 'quiz', 150),
(3, 'prompt', 3, '角色扮演 Prompt', 'teach', 100),
(4, 'prompt', 4, 'Chain of Thought', 'quiz', 200),
(5, 'prompt', 5, 'Prompt 注入防禦', 'quiz', 200),
(6, 'prompt', 6, 'BOSS：綜合挑戰', 'boss', 500)
ON CONFLICT (level_id) DO UPDATE SET
    planet_id = EXCLUDED.planet_id,
    level_number = EXCLUDED.level_number,
    title = EXCLUDED.title,
    content_type = EXCLUDED.content_type,
    xp_reward = EXCLUDED.xp_reward;

-- Achievements
INSERT INTO achievements (achievement_id, name, description, icon, rarity, xp_reward) VALUES
('first-step', '初學者', '完成第一個關卡', '🌱', 'common', 50),
('prompt-master', 'Prompt 大師', '完成 Prompt 星所有關卡', '⚡', 'epic', 500),
('streak-7', '連勝達人', '連續登入 7 天', '🔥', 'rare', 200),
('arena-winner', '競技場冠軍', '在 Prompt Arena 獲得第一名', '🏆', 'legendary', 1000),
('speed-run', '閃電學者', '在 30 秒內完成一個關卡', '⚡', 'rare', 300),
('perfect', '完美主義者', '一題都不錯的完成一章', '💎', 'epic', 400)
ON CONFLICT (achievement_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    rarity = EXCLUDED.rarity,
    xp_reward = EXCLUDED.xp_reward;

-- Quiz Questions
INSERT INTO quiz_questions (level_id, question_number, question_text, options, correct_option_index, explanation, xp_reward) VALUES
(2, 1, '以下哪種 Prompt 技術最適合需要 AI 進行逐步推理的任務？', '["Zero-shot Prompting", "Chain of Thought (CoT) Prompting", "One-shot Prompting", "Temperature Adjustment"]', 1, 'Chain of Thought Prompting 讓 AI 展示推理步驟，特別適合數學、邏輯等需要多步推理的任務。', 150),
(2, 2, 'LLM 中的 "Token" 最接近以下哪個概念？', '["完整的一個詞語", "文字的最小處理單位（約 3-4 個字元）", "一個完整的句子", "一段程式碼"]', 1, 'Token 是 LLM 處理文字的最小單位，英文中約 4 個字元，中文每個字通常是 1-2 個 Token。', 150),
(4, 1, '在 LLM 的 Temperature 參數中，接近 0 的值會產生什麼效果？', '["更有創意和多樣化的輸出", "更隨機和不可預期的回應", "更確定性和保守的輸出", "更快的回應速度"]', 2, 'Temperature 接近 0 時，模型傾向選擇最高機率的 Token，輸出更加確定 and 一致；接近 1 則更有創意和多樣性。', 200),
(5, 1, '以下關於 RAG（Retrieval-Augmented Generation）的敘述，哪個正確？', '["RAG 會永久修改 LLM 的參數", "RAG 在推理時動態檢索外部知識庫", "RAG 比 Fine-tuning 需要更多訓練資料", "RAG 只適用於圖像生成"]', 1, 'RAG 在生成回應時即時從外部知識庫檢索相關資訊，不需修改模型本身，適合需要最新資訊的場景。', 200)
ON CONFLICT (level_id, question_number) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option_index = EXCLUDED.correct_option_index,
    explanation = EXCLUDED.explanation,
    xp_reward = EXCLUDED.xp_reward;

-- Arena Challenges
INSERT INTO arena_challenges (challenge_id, title, description, difficulty, example_prompts) VALUES
('a1', '詩意烹飪師', '用 Prompt 讓 AI 以詩意的方式描述「番茄炒蛋」食譜', 'easy', '["加入押韻要求", "指定詩歌風格", "限制字數"]'),
('a2', '科學解釋家', '讓 AI 用 5 歲小孩能理解的語言解釋「黑洞是什麼」', 'medium', '["類比日常物品", "避免專業術語", "加入趣味比喻"]'),
('a3', '智慧辯手', '設計 Prompt 讓 AI 同時提供贊成和反對「AI 取代工程師」的理由', 'hard', '["平衡雙方觀點", "引用具體例子", "提供結論建議"]')
ON CONFLICT (challenge_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    difficulty = EXCLUDED.difficulty,
    example_prompts = EXCLUDED.example_prompts;

-- Dummy Players and Progress for Testing
INSERT INTO players (username, xp, streak_days, guild_name) VALUES
('NeuralNinja', 48920, 32, 'AI Pioneers'),
('PromptPhysicist', 42150, 15, 'Deep Minds'),
('TokenWizard', 38700, 28, 'AI Pioneers'),
('LLMSurfer', 32400, 7, 'Prompt Lords'),
('VectorQueen', 29800, 21, 'Deep Minds'),
('EmbeddingElf', 26500, 5, NULL),
('RAGRunner', 22100, 12, 'Prompt Lords'),
('AttentionAce', 19800, 3, NULL),
('AgentAlpha', 17200, 9, 'AI Pioneers'),
('YouPlayer', 14500, 4, '新手村')
ON CONFLICT (username) DO NOTHING;

-- Initial Progress for YouPlayer
INSERT INTO player_progress (player_id, level_id)
SELECT p.player_id, l.level_id
FROM players p, levels l
WHERE p.username = 'YouPlayer' AND l.level_id IN (1, 2, 3)
ON CONFLICT (player_id, level_id) DO NOTHING;
