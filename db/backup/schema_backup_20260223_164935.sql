-- NeuroQuest AI - Database Schema

-- Planets Table
CREATE TABLE IF NOT EXISTS planets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtitle TEXT,
    icon TEXT,
    color TEXT,
    glow_color TEXT,
    bg_gradient TEXT,
    x INTEGER,
    y INTEGER,
    total_levels INTEGER DEFAULT 0,
    description TEXT,
    locked BOOLEAN DEFAULT TRUE,
    required_planet_id TEXT REFERENCES planets(id)
);

-- Levels Table
CREATE TABLE IF NOT EXISTS levels (
    id TEXT PRIMARY KEY,
    planet_id TEXT NOT NULL REFERENCES planets(id),
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('teach', 'quiz', 'boss')),
    xp_reward INTEGER DEFAULT 0
);

-- Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    unlocked BOOLEAN DEFAULT FALSE,
    xp_reward INTEGER DEFAULT 0
);

-- Quiz Questions Table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation TEXT,
    xp INTEGER DEFAULT 0
);

-- Arena Challenges Table
CREATE TABLE IF NOT EXISTS arena_challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    examples JSONB
);

-- Initial Data Migration

-- Planets
INSERT INTO planets (id, name, subtitle, icon, color, glow_color, bg_gradient, x, y, total_levels, description, locked) VALUES
('prompt', 'Prompt 星', 'Prompt Engineering', '⚡', '#8B5CF6', 'rgba(139,92,246,0.5)', 'from-purple-900 to-violet-950', 30, 40, 6, '掌握 Prompt 的力量，讓 AI 為你所用', false),
('model', 'Model 星', 'LLM 模型原理', '🧠', '#3B82F6', 'rgba(59,130,246,0.5)', 'from-blue-900 to-cyan-950', 62, 25, 6, '深入 Transformer 的核心，理解 AI 如何思考', true),
('vision', 'Vision 星', '多模態 AI', '👁️', '#F97316', 'rgba(249,115,22,0.5)', 'from-orange-900 to-red-950', 75, 58, 5, '看見 AI 的眼睛，探索圖像、聲音與文字的融合', true),
('ethics', 'Ethics 星', 'AI 倫理', '⚖️', '#EF4444', 'rgba(239,68,68,0.5)', 'from-red-900 to-rose-950', 45, 70, 5, '守護 AI 的邊界，成為負責任的創造者', true),
('agent', 'Agent 星', 'AI Agents', '🤖', '#10B981', 'rgba(16,185,129,0.5)', 'from-emerald-900 to-green-950', 18, 65, 5, '釋放 AI Agent 的潛力，打造自主智能系統', true),
('future', 'Future 星', 'AGI & 未來趨勢', '🌟', '#FFB800', 'rgba(255,184,0,0.5)', 'from-yellow-900 to-amber-950', 50, 48, 4, '站在時代浪尖，洞察 AI 的未來', true);

UPDATE planets SET required_planet_id = 'prompt' WHERE id = 'model';
UPDATE planets SET required_planet_id = 'model' WHERE id = 'vision';
UPDATE planets SET required_planet_id = 'vision' WHERE id = 'ethics';
UPDATE planets SET required_planet_id = 'ethics' WHERE id = 'agent';
UPDATE planets SET required_planet_id = 'agent' WHERE id = 'future';

-- Levels
INSERT INTO levels (id, planet_id, number, title, type, xp_reward) VALUES
('p1-1', 'prompt', 1, '什麼是 Prompt？', 'teach', 100),
('p1-2', 'prompt', 2, 'Zero-shot vs Few-shot', 'quiz', 150),
('p1-3', 'prompt', 3, '角色扮演 Prompt', 'teach', 100),
('p1-4', 'prompt', 4, 'Chain of Thought', 'quiz', 200),
('p1-5', 'prompt', 5, 'Prompt 注入防禦', 'quiz', 200),
('p1-6', 'prompt', 6, 'BOSS：綜合挑戰', 'boss', 500);

-- Achievements
INSERT INTO achievements (id, name, description, icon, rarity, unlocked, xp_reward) VALUES
('first-step', '初學者', '完成第一個關卡', '🌱', 'common', true, 50),
('prompt-master', 'Prompt 大師', '完成 Prompt 星所有關卡', '⚡', 'epic', false, 500),
('streak-7', '連勝達人', '連續登入 7 天', '🔥', 'rare', false, 200),
('arena-winner', '競技場冠軍', '在 Prompt Arena 獲得第一名', '🏆', 'legendary', false, 1000),
('speed-run', '閃電學者', '在 30 秒內完成一個關卡', '⚡', 'rare', false, 300),
('perfect', '完美主義者', '一題都不錯的完成一章', '💎', 'epic', false, 400);

-- Quiz Questions
INSERT INTO quiz_questions (id, question, options, correct_index, explanation, xp) VALUES
('q1', '以下哪種 Prompt 技術最適合需要 AI 進行逐步推理的任務？', '["Zero-shot Prompting", "Chain of Thought (CoT) Prompting", "One-shot Prompting", "Temperature Adjustment"]', 1, 'Chain of Thought Prompting 讓 AI 展示推理步驟，特別適合數學、邏輯等需要多步推理的任務。', 150),
('q2', 'LLM 中的 "Token" 最接近以下哪個概念？', '["完整的一個詞語", "文字的最小處理單位（約 3-4 個字元）", "一個完整的句子", "一段程式碼"]', 1, 'Token 是 LLM 處理文字的最小單位，英文中約 4 個字元，中文每個字通常是 1-2 個 Token。', 150),
('q3', '在 LLM 的 Temperature 參數中，接近 0 的值會產生什麼效果？', '["更有創意和多樣化的輸出", "更隨機和不可預期的回應", "更確定性和保守的輸出", "更快的回應速度"]', 2, 'Temperature 接近 0 時，模型傾向選擇最高機率的 Token，輸出更加確定和一致；接近 1 則更有創意和多樣性。', 200),
('q4', '以下關於 RAG（Retrieval-Augmented Generation）的敘述，哪個正確？', '["RAG 會永久修改 LLM 的參數", "RAG 在推理時動態檢索外部知識庫", "RAG 比 Fine-tuning 需要更多訓練資料", "RAG 只適用於圖像生成"]', 1, 'RAG 在生成回應時即時從外部知識庫檢索相關資訊，不需修改模型本身，適合需要最新資訊的場景。', 200);

-- Arena Challenges
INSERT INTO arena_challenges (id, title, description, difficulty, examples) VALUES
('a1', '詩意烹飪師', '用 Prompt 讓 AI 以詩意的方式描述「番茄炒蛋」食譜', 'easy', '["加入押韻要求", "指定詩歌風格", "限制字數"]'),
('a2', '科學解釋家', '讓 AI 用 5 歲小孩能理解的語言解釋「黑洞是什麼」', 'medium', '["類比日常物品", "避免專業術語", "加入趣味比喻"]'),
('a3', '智慧辯手', '設計 Prompt 讓 AI 同時提供贊成和反對「AI 取代工程師」的理由', 'hard', '["平衡雙方觀點", "引用具體例子", "提供結論建議"]');
