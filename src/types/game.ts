// Shared types between Backend and Frontend to enforce data consistency

export interface Planet {
    id: string; // Map to 'rollup' in DB
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
    requiredPlanet?: string;
    locked?: boolean;
}

export interface Level {
    id: string | number;
    planetId: string; // Map to 'rollup' in DB
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
    id: number;
    number: number;
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

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    url: string;
    date: string;
    source: string;
    tier: number;
    category: string;
    categoryColor: string;
    reward: number;
    questions?: QuizQuestion[];
}

export interface UserProfile {
    player_id: string;
    playerName: string;
    playerAvatar: string;
    xp: number;
    streak: number;
    level: number;
    lastLogin: string | Date | null;
    lastRewardClaimed: string | Date | null;
    showDailyReward: boolean;
    completedLevels: number[];
    unlockedAchievements: string[];
}

export interface ProfileOption {
    key: string;
    label: string;
    icon: string;
    description: string | null;
    score: number;
}

export interface PlayerProfile {
    background: string;
    interests: string[];
    difficulty_score: number;
    created_at?: string;
}

