// Shared types between Backend and Frontend to enforce data consistency

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
