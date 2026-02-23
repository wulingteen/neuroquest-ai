"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getLevelFromXP, getLevelProgress, getLevelTitle } from "@/lib/gameData";

interface GameState {
    // Player data
    playerName: string;
    playerAvatar: string;
    xp: number;
    streak: number;
    lastLogin: string | null;
    completedLevels: Set<string>;
    unlockedAchievements: Set<string>;

    // UI state
    currentPlanet: string | null;
    currentLevel: string | null;
    showDailyReward: boolean;

    // Computed
    level: number;
    levelProgress: number;
    levelTitle: string;

    // Actions
    addXP: (amount: number) => void;
    completeLevel: (levelId: string) => void;
    unlockAchievement: (achievementId: string) => void;
    setCurrentPlanet: (planetId: string | null) => void;
    setCurrentLevel: (levelId: string | null) => void;
    checkDailyLogin: () => void;
    dismissDailyReward: () => void;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            playerName: "YouPlayer",
            playerAvatar: "🌟",
            xp: 14500,
            streak: 4,
            lastLogin: null,
            completedLevels: new Set(["p1-1"]),
            unlockedAchievements: new Set(["first-step"]),
            currentPlanet: null,
            currentLevel: null,
            showDailyReward: false,
            level: getLevelFromXP(14500),
            levelProgress: getLevelProgress(14500),
            levelTitle: getLevelTitle(getLevelFromXP(14500)),

            addXP: (amount) => {
                set((state) => {
                    const newXP = state.xp + amount;
                    return {
                        xp: newXP,
                        level: getLevelFromXP(newXP),
                        levelProgress: getLevelProgress(newXP),
                        levelTitle: getLevelTitle(getLevelFromXP(newXP)),
                    };
                });
            },

            completeLevel: (levelId) => {
                set((state) => {
                    const newCompleted = new Set(state.completedLevels);
                    newCompleted.add(levelId);
                    return { completedLevels: newCompleted };
                });
            },

            unlockAchievement: (achievementId) => {
                set((state) => {
                    const newAchievements = new Set(state.unlockedAchievements);
                    newAchievements.add(achievementId);
                    return { unlockedAchievements: newAchievements };
                });
            },

            setCurrentPlanet: (planetId) => set({ currentPlanet: planetId }),
            setCurrentLevel: (levelId) => set({ currentLevel: levelId }),

            checkDailyLogin: () => {
                const today = new Date().toDateString();
                const { lastLogin } = get();
                if (lastLogin !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const wasYesterday = lastLogin === yesterday.toDateString();
                    set((state) => ({
                        lastLogin: today,
                        streak: wasYesterday ? state.streak + 1 : 1,
                        showDailyReward: true,
                    }));
                }
            },

            dismissDailyReward: () => set({ showDailyReward: false }),
        }),
        {
            name: "neuroquest-game",
            partialize: (state) => ({
                playerName: state.playerName,
                playerAvatar: state.playerAvatar,
                xp: state.xp,
                streak: state.streak,
                lastLogin: state.lastLogin,
                completedLevels: Array.from(state.completedLevels),
                unlockedAchievements: Array.from(state.unlockedAchievements),
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Convert arrays back to Sets after rehydration
                    if (Array.isArray((state as any).completedLevels)) {
                        state.completedLevels = new Set((state as any).completedLevels);
                    }
                    if (Array.isArray((state as any).unlockedAchievements)) {
                        state.unlockedAchievements = new Set((state as any).unlockedAchievements);
                    }
                    const xp = state.xp;
                    state.level = getLevelFromXP(xp);
                    state.levelProgress = getLevelProgress(xp);
                    state.levelTitle = getLevelTitle(getLevelFromXP(xp));
                }
            },
        }
    )
);
