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

-- Initial Data Migration

-- Planets
INSERT INTO planets (planet_id, rollup, label, subtitle, icon, color, glow_color, bg_gradient, x, y, description) VALUES
(1, 'prompt', 'Prompt 星', 'Prompt Engineering', '⚡', '#8B5CF6', 'rgba(139,92,246,0.5)', 'from-purple-900 to-violet-950', 30, 40, '掌握 Prompt 的力量，讓 AI 為你所用'),
(2, 'model', 'Model 星', 'LLM 模型原理', '🧠', '#3B82F6', 'rgba(59,130,246,0.5)', 'from-blue-900 to-cyan-950', 62, 25, '深入 Transformer 的核心，理解 AI 如何思考'),
(3, 'vision', 'Vision 星', '多模態 AI', '👁️', '#F97316', 'rgba(249,115,22,0.5)', 'from-orange-900 to-red-950', 75, 58, '看見 AI 的眼睛，探索圖像、聲音與文字的融合'),
(4, 'ethics', 'Ethics 星', 'AI 倫理', '⚖️', '#EF4444', 'rgba(239,68,68,0.5)', 'from-red-900 to-rose-950', 45, 70, '守護 AI 的邊界，成為負責任的創造者'),
(5, 'agent', 'Agent 星', 'AI Agents', '🤖', '#10B981', 'rgba(16,185,129,0.5)', 'from-emerald-900 to-green-950', 18, 65, '釋放 AI Agent 的潛力，打造自主智能系統'),
(6, 'future', 'Future 星', 'AGI & 未來趨勢', '🌟', '#FFB800', 'rgba(255,184,0,0.5)', 'from-yellow-900 to-amber-950', 50, 48, '站在時代浪尖，洞察 AI 的未來')
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
(1, 'prompt', 1, '什麼是 Prompt？', 'teach', 100),
(2, 'prompt', 2, 'Zero-shot vs Few-shot', 'quiz', 150),
(3, 'prompt', 3, '角色扮演 Prompt', 'teach', 100),
(4, 'prompt', 4, 'Chain of Thought', 'quiz', 200),
(5, 'prompt', 5, 'Prompt 注入防禦', 'quiz', 200),
(6, 'prompt', 6, 'BOSS：綜合挑戰', 'boss', 500),
(10, 'model', 1, '什麼是 LLM？', 'teach', 150),
(11, 'model', 2, 'Transformer 架構', 'quiz', 200),
(12, 'model', 3, '微調技術 (Fine-tuning)', 'boss', 400),
(13, 'vision', 1, '多模態簡介', 'teach', 150),
(14, 'vision', 2, '圖像生成模型', 'quiz', 250),
(15, 'ethics', 1, 'AI 偏見與公平性', 'teach', 150),
(16, 'ethics', 2, '版權與隱私', 'quiz', 200),
(17, 'ethics', 3, '負責任的 AI', 'boss', 400),
(18, 'agent', 1, '什麼是 AI Agent？', 'teach', 200),
(19, 'agent', 2, '工具調用 (Tool Use)', 'quiz', 300),
(20, 'future', 1, 'AGI 概念', 'teach', 250),
(21, 'future', 2, 'AI 的下一步', 'quiz', 350)
ON CONFLICT (level_id) DO UPDATE SET
    rollup = EXCLUDED.rollup,
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
INSERT INTO quiz_questions (rollup, level_number, question_number, question_text, options, correct_option_index, explanation, xp_reward) VALUES
('prompt', 2, 1, '以下哪種 Prompt 技術最適合需要 AI 進行逐步推理的任務？', '["Zero-shot Prompting", "Chain of Thought (CoT) Prompting", "One-shot Prompting", "Temperature Adjustment"]', 1, 'Chain of Thought Prompting 讓 AI 展示推理步驟，特別適合數學、邏輯等需要多步推理的任務。', 150),
('prompt', 2, 2, 'LLM 中的 "Token" 最接近以下哪個概念？', '["完整的一個詞語", "文字的最小處理單位（約 3-4 個字元）", "一個完整的句子", "一段程式碼"]', 1, 'Token 是 LLM 處理文字的最小單位，英文中約 4 個字元，中文每個字通常是 1-2 個 Token。', 150),
('prompt', 4, 1, '在 LLM 的 Temperature 參數中，接近 0 的值會產生什麼效果？', '["更有創意和多樣化的輸出", "更隨機和不可預期的回應", "更確定性和保守的輸出", "更快的回應速度"]', 2, 'Temperature 接近 0 時，模型傾向選擇最高機率的 Token，輸出更加確定 and 一致；接近 1 則更有創意和多樣性。', 200),
('prompt', 5, 1, '以下關於 RAG（Retrieval-Augmented Generation）的敘述，哪個正確？', '["RAG 會永久修改 LLM 的參數", "RAG 在推理時動態檢索外部知識庫", "RAG 比 Fine-tuning 需要更多訓練資料", "RAG 只適用於圖像生成"]', 1, 'RAG 在生成回應時即時從外部知識庫檢索相關資訊，不需修改模型本身，適合需要最新資訊的場景。', 200),
('prompt', 6, 1, '以下關於 RAG（Retrieval-Augmented Generation）的敘述，哪個正確？', '["RAG 會永久修改 LLM 的參數", "RAG 在推理時動態檢索外部知識庫", "RAG 比 Fine-tuning 需要更多訓練資料", "RAG 只適用於圖像生成"]', 1, 'RAG 在生成回應時即時從外部知識庫檢索相關資訊，不需修改模型本身，適合需要最新資訊的場景。', 200),
('model', 2, 1, 'Transformer 模型的哪一個核心機制讓它能夠處理長文本中的依賴關係？', '["Self-Attention 機制", "卷積層 (Convolution)", "循環神經網絡 (RNN)", "池化層 (Pooling)"]', 0, 'Self-Attention (自注意力機制) 允許模型在處理一個詞時，同時關注序列中的其他詞，從而理解長距離依賴關係。', 200),
('model', 3, 1, '以下哪一種微調方法可以在大幅減少計算資源的情況下，調整大模型？', '["Full Fine-tuning (全參數微調)", "LoRA (Low-Rank Adaptation)", "Pre-training (預訓練)", "RAG"]', 1, 'LoRA 是一種參數高效微調 (PEFT) 方法，通過在模型的權重矩陣旁添加低秩矩陣來更新參數，大幅節省資源。', 400),
('vision', 2, 1, 'Midjourney 和 Stable Diffusion 主要基於哪種技術架構？', '["GAN (生成對抗網絡)", "Diffusion Model (擴散模型)", "RNN", "CNN"]', 1, '擴散模型 (Diffusion Model) 是目前主流的圖像生成技術，透過學習去噪過程來生成高質量的圖片。', 250),
('ethics', 2, 1, '如果 AI 模型使用受版權保護的資料進行訓練，這在目前的法律界定上主要面臨什麼爭議？', '["違反了模型的安全協議", "合理使用 (Fair Use) 與侵權的界限", "模型將會變慢", "開源協定的衝突"]', 1, 'AI 訓練資料是否屬於「合理使用」目前是版權法中的重大爭議，牽涉創作者權益和技術發展。', 200),
('ethics', 3, 1, '在開發「負責任的 AI」時，以下哪項是最核心的原則之一？', '["盡可能提升模型參數", "確保透明度和可解釋性", "完全自動化無需人工審查", "追求最高的準確率而忽略偏見"]', 1, '透明度和可解釋性是負責任 AI 的基準，讓使用者和開發者了解 AI 的決策過程並追溯潛在錯誤。', 400),
('agent', 2, 1, '當 AI Agent 需要獲取即時天氣資訊時，它依賴的關鍵能力是什麼？', '["增加 Temperature 參數", "Tool Use (工具調用 / 函數調用)", "改變 Prompt 風格", "Zero-shot 推理"]', 1, '工具調用 (Tool Use 或 Function Calling) 賦予 Agent 執行外部 API或腳本的能力，使其能獲取實時數據。', 300),
('future', 2, 1, '關於 AGI (通用人工智慧) 的敘述，以下何者最準確？', '["AGI 指的是只能進行單一任務的專家系統", "AGI 能夠在任何智力任務上達到或超越人類水平", "目前的 ChatGPT 已經是完美的 AGI", "AGI 只是指計算機的算力大幅提升"]', 1, 'AGI 是一種假想中的人工智慧，能在各種認知任務上展現出與人類相當或超越人類的能力。', 350)
ON CONFLICT (rollup, level_number, question_number) DO UPDATE SET
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
