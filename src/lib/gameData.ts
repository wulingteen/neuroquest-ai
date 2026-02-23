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

export interface ArenaChallenge {
    id: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    examples: string[];
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    xp: number;
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



export function getXPForLevel(level: number): number {
    return level * 1000;
}

export function getLevelFromXP(xp: number): number {
    return Math.floor(xp / 1000) + 1;
}

export function getLevelProgress(xp: number): number {
    const currentLevelXP = Math.floor(xp / 1000) * 1000;
    return ((xp - currentLevelXP) / 1000) * 100;
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
