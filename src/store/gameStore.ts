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
    isLoaded: boolean;

    // UI state
    currentPlanet: string | null;
    currentLevel: string | null;
    showDailyReward: boolean;

    // Computed
    level: number;
    levelProgress: number;
    levelTitle: string;

    // Actions
    fetchUser: () => Promise<void>;
    addXP: (amount: number) => Promise<void>;
    completeLevel: (levelId: string) => Promise<void>;
    unlockAchievement: (achievementId: string) => void;
    setCurrentPlanet: (planetId: string | null) => void;
    setCurrentLevel: (levelId: string | null) => void;
    checkDailyLogin: () => void;
    dismissDailyReward: () => void;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            playerName: "Loading...",
            playerAvatar: "👤",
            xp: 0,
            streak: 0,
            lastLogin: null,
            completedLevels: new Set(),
            unlockedAchievements: new Set(),
            isLoaded: false,
            currentPlanet: null,
            currentLevel: null,
            showDailyReward: false,
            level: 1,
            levelProgress: 0,
            levelTitle: getLevelTitle(1),

            fetchUser: async () => {
                try {
                    const response = await fetch('/api/user');
                    const result = await response.json();
                    if (result.success) {
                        const { playerName, playerAvatar, xp, streak, lastLogin, completedLevels, unlockedAchievements } = result.data;
                        set({
                            playerName,
                            playerAvatar,
                            xp,
                            streak,
                            lastLogin,
                            completedLevels: new Set(completedLevels),
                            unlockedAchievements: new Set(unlockedAchievements),
                            level: getLevelFromXP(xp),
                            levelProgress: getLevelProgress(xp),
                            levelTitle: getLevelTitle(getLevelFromXP(xp)),
                            isLoaded: true,
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                }
            },

            addXP: async (amount) => {
                const newXP = get().xp + amount;
                set((state) => ({
                    xp: newXP,
                    level: getLevelFromXP(newXP),
                    levelProgress: getLevelProgress(newXP),
                    levelTitle: getLevelTitle(getLevelFromXP(newXP)),
                }));

                // Sync with DB
                try {
                    await fetch('/api/user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ xp: newXP }),
                    });
                } catch (error) {
                    console.error("Failed to sync XP with DB:", error);
                }
            },

            completeLevel: async (levelId) => {
                set((state) => {
                    const newCompleted = new Set(state.completedLevels);
                    newCompleted.add(levelId);
                    return { completedLevels: newCompleted };
                });

                // Sync with DB
                try {
                    await fetch('/api/user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ completedLevelId: levelId }),
                    });
                } catch (error) {
                    console.error("Failed to sync progress with DB:", error);
                }
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
                const { lastLogin, streak } = get();
                if (lastLogin !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const wasYesterday = lastLogin === yesterday.toDateString();
                    const newStreak = wasYesterday ? streak + 1 : 1;

                    set({
                        lastLogin: today,
                        streak: newStreak,
                        showDailyReward: true,
                    });

                    // Sync streak with DB
                    fetch('/api/user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ streak: newStreak }),
                    }).catch(err => console.error("Failed to sync streak:", err));
                }
            },

            dismissDailyReward: () => set({ showDailyReward: false }),
        }),
        {
            name: "neuroquest-game",
            partialize: (state) => ({
                currentPlanet: state.currentPlanet,
                currentLevel: state.currentLevel,
            }),
        }
    )
);

