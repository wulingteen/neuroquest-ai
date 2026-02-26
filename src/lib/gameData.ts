import { Planet, Level, Achievement, ArenaChallenge, QuizQuestion, LeaderboardEntry } from "@/types/game";

export type { Planet, Level, Achievement, ArenaChallenge, QuizQuestion, LeaderboardEntry };



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
