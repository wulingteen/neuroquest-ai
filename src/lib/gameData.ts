export interface Planet {
    id: string;
    name: string;
    subtitle: string;
    icon: string;
    color: string;
    glowColor: string;
    bgGradient: string;
    x: number;
    y: number;
    totalLevels: number;
    description: string;
    locked: boolean;
    requiredPlanet?: string;
}

export interface Level {
    id: string;
    planetId: string;
    number: number;
    title: string;
    type: "teach" | "quiz" | "boss";
    xpReward: number;
    completed?: boolean;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    unlocked: boolean;
    xpReward: number;
}

export interface LeaderboardEntry {
    rank: number;
    name: string;
    avatar: string;
    level: number;
    xp: number;
    streak: number;
    guild?: string;
}

export const PLANETS: Planet[] = [
    {
        id: "prompt",
        name: "Prompt 星",
        subtitle: "Prompt Engineering",
        icon: "⚡",
        color: "#8B5CF6",
        glowColor: "rgba(139,92,246,0.5)",
        bgGradient: "from-purple-900 to-violet-950",
        x: 30,
        y: 40,
        totalLevels: 6,
        description: "掌握 Prompt 的力量，讓 AI 為你所用",
        locked: false,
    },
    {
        id: "model",
        name: "Model 星",
        subtitle: "LLM 模型原理",
        icon: "🧠",
        color: "#3B82F6",
        glowColor: "rgba(59,130,246,0.5)",
        bgGradient: "from-blue-900 to-cyan-950",
        x: 62,
        y: 25,
        totalLevels: 6,
        description: "深入 Transformer 的核心，理解 AI 如何思考",
        locked: true,
        requiredPlanet: "prompt",
    },
    {
        id: "vision",
        name: "Vision 星",
        subtitle: "多模態 AI",
        icon: "👁️",
        color: "#F97316",
        glowColor: "rgba(249,115,22,0.5)",
        bgGradient: "from-orange-900 to-red-950",
        x: 75,
        y: 58,
        totalLevels: 5,
        description: "看見 AI 的眼睛，探索圖像、聲音與文字的融合",
        locked: true,
        requiredPlanet: "model",
    },
    {
        id: "ethics",
        name: "Ethics 星",
        subtitle: "AI 倫理",
        icon: "⚖️",
        color: "#EF4444",
        glowColor: "rgba(239,68,68,0.5)",
        bgGradient: "from-red-900 to-rose-950",
        x: 45,
        y: 70,
        totalLevels: 5,
        description: "守護 AI 的邊界，成為負責任的創造者",
        locked: true,
        requiredPlanet: "vision",
    },
    {
        id: "agent",
        name: "Agent 星",
        subtitle: "AI Agents",
        icon: "🤖",
        color: "#10B981",
        glowColor: "rgba(16,185,129,0.5)",
        bgGradient: "from-emerald-900 to-green-950",
        x: 18,
        y: 65,
        totalLevels: 5,
        description: "釋放 AI Agent 的潛力，打造自主智能系統",
        locked: true,
        requiredPlanet: "ethics",
    },
    {
        id: "future",
        name: "Future 星",
        subtitle: "AGI & 未來趨勢",
        icon: "🌟",
        color: "#FFB800",
        glowColor: "rgba(255,184,0,0.5)",
        bgGradient: "from-yellow-900 to-amber-950",
        x: 50,
        y: 48,
        totalLevels: 4,
        description: "站在時代浪尖，洞察 AI 的未來",
        locked: true,
        requiredPlanet: "agent",
    },
];

export const PROMPT_LEVELS: Level[] = [
    { id: "p1-1", planetId: "prompt", number: 1, title: "什麼是 Prompt？", type: "teach", xpReward: 100 },
    { id: "p1-2", planetId: "prompt", number: 2, title: "Zero-shot vs Few-shot", type: "quiz", xpReward: 150 },
    { id: "p1-3", planetId: "prompt", number: 3, title: "角色扮演 Prompt", type: "teach", xpReward: 100 },
    { id: "p1-4", planetId: "prompt", number: 4, title: "Chain of Thought", type: "quiz", xpReward: 200 },
    { id: "p1-5", planetId: "prompt", number: 5, title: "Prompt 注入防禦", type: "quiz", xpReward: 200 },
    { id: "p1-boss", planetId: "prompt", number: 6, title: "BOSS：綜合挑戰", type: "boss", xpReward: 500 },
];

export const ACHIEVEMENTS: Achievement[] = [
    { id: "first-step", name: "初學者", description: "完成第一個關卡", icon: "🌱", rarity: "common", unlocked: true, xpReward: 50 },
    { id: "prompt-master", name: "Prompt 大師", description: "完成 Prompt 星所有關卡", icon: "⚡", rarity: "epic", unlocked: false, xpReward: 500 },
    { id: "streak-7", name: "連勝達人", description: "連續登入 7 天", icon: "🔥", rarity: "rare", unlocked: false, xpReward: 200 },
    { id: "arena-winner", name: "競技場冠軍", description: "在 Prompt Arena 獲得第一名", icon: "🏆", rarity: "legendary", unlocked: false, xpReward: 1000 },
    { id: "speed-run", name: "閃電學者", description: "在 30 秒內完成一個關卡", icon: "⚡", rarity: "rare", unlocked: false, xpReward: 300 },
    { id: "perfect", name: "完美主義者", description: "一題都不錯的完成一章", icon: "💎", rarity: "epic", unlocked: false, xpReward: 400 },
];

export const LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, name: "NeuralNinja", avatar: "🥷", level: 42, xp: 48920, streak: 32, guild: "AI Pioneers" },
    { rank: 2, name: "PromptPhysicist", avatar: "⚛️", level: 38, xp: 42150, streak: 15, guild: "Deep Minds" },
    { rank: 3, name: "TokenWizard", avatar: "🧙", level: 35, xp: 38700, streak: 28, guild: "AI Pioneers" },
    { rank: 4, name: "LLMSurfer", avatar: "🏄", level: 31, xp: 32400, streak: 7, guild: "Prompt Lords" },
    { rank: 5, name: "VectorQueen", avatar: "👸", level: 29, xp: 29800, streak: 21, guild: "Deep Minds" },
    { rank: 6, name: "EmbeddingElf", avatar: "🧝", level: 27, xp: 26500, streak: 5 },
    { rank: 7, name: "RAGRunner", avatar: "🏃", level: 24, xp: 22100, streak: 12, guild: "Prompt Lords" },
    { rank: 8, name: "AttentionAce", avatar: "🎯", level: 22, xp: 19800, streak: 3 },
    { rank: 9, name: "AgentAlpha", avatar: "🤖", level: 20, xp: 17200, streak: 9, guild: "AI Pioneers" },
    { rank: 10, name: "YouPlayer", avatar: "🌟", level: 18, xp: 14500, streak: 4, guild: "新手村" },
];

export const QUIZ_QUESTIONS = [
    {
        id: "q1",
        question: "以下哪種 Prompt 技術最適合需要 AI 進行逐步推理的任務？",
        options: [
            "Zero-shot Prompting",
            "Chain of Thought (CoT) Prompting",
            "One-shot Prompting",
            "Temperature Adjustment",
        ],
        correct: 1,
        explanation: "Chain of Thought Prompting 讓 AI 展示推理步驟，特別適合數學、邏輯等需要多步推理的任務。",
        xp: 150,
    },
    {
        id: "q2",
        question: "LLM 中的 'Token' 最接近以下哪個概念？",
        options: [
            "完整的一個詞語",
            "文字的最小處理單位（約 3-4 個字元）",
            "一個完整的句子",
            "一段程式碼",
        ],
        correct: 1,
        explanation: "Token 是 LLM 處理文字的最小單位，英文中約 4 個字元，中文每個字通常是 1-2 個 Token。",
        xp: 150,
    },
    {
        id: "q3",
        question: "在 LLM 的 Temperature 參數中，接近 0 的值會產生什麼效果？",
        options: [
            "更有創意和多樣化的輸出",
            "更隨機和不可預期的回應",
            "更確定性和保守的輸出",
            "更快的回應速度",
        ],
        correct: 2,
        explanation: "Temperature 接近 0 時，模型傾向選擇最高機率的 Token，輸出更加確定和一致；接近 1 則更有創意和多樣性。",
        xp: 200,
    },
    {
        id: "q4",
        question: "以下關於 RAG（Retrieval-Augmented Generation）的敘述，哪個正確？",
        options: [
            "RAG 會永久修改 LLM 的參數",
            "RAG 在推理時動態檢索外部知識庫",
            "RAG 比 Fine-tuning 需要更多訓練資料",
            "RAG 只適用於圖像生成",
        ],
        correct: 1,
        explanation: "RAG 在生成回應時即時從外部知識庫檢索相關資訊，不需修改模型本身，適合需要最新資訊的場景。",
        xp: 200,
    },
];

export const ARENA_CHALLENGES = [
    {
        id: "a1",
        title: "詩意烹飪師",
        description: "用 Prompt 讓 AI 以詩意的方式描述「番茄炒蛋」食譜",
        difficulty: "easy",
        examples: ["加入押韻要求", "指定詩歌風格", "限制字數"],
    },
    {
        id: "a2",
        title: "科學解釋家",
        description: "讓 AI 用 5 歲小孩能理解的語言解釋「黑洞是什麼」",
        difficulty: "medium",
        examples: ["類比日常物品", "避免專業術語", "加入趣味比喻"],
    },
    {
        id: "a3",
        title: "智慧辯手",
        description: "設計 Prompt 讓 AI 同時提供贊成和反對「AI 取代工程師」的理由",
        difficulty: "hard",
        examples: ["平衡雙方觀點", "引用具體例子", "提供結論建議"],
    },
];

export function getXPForLevel(level: number): number {
    return level * 1000;
}

export function getLevelFromXP(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getLevelProgress(xp: number): number {
    const level = getLevelFromXP(xp);
    const currentLevelXP = (level - 1) * (level - 1) * 100;
    const nextLevelXP = level * level * 100;
    return ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
}

export const LEVEL_TITLES = [
    "AI 新人", "初級研究員", "助理工程師", "工程師",
    "高級工程師", "技術主管", "AI 架構師", "首席科學家",
    "AI 先驅者", "傳說中的探索者",
];

export function getLevelTitle(level: number): string {
    const index = Math.min(Math.floor((level - 1) / 5), LEVEL_TITLES.length - 1);
    return LEVEL_TITLES[index];
}
