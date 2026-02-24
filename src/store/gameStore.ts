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
    completedLevels: Set<number>;
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
    completeLevel: (levelId: string | number) => Promise<void>;
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
                        const { playerName, playerAvatar, xp, streak, level, lastLogin, completedLevels, unlockedAchievements, showDailyReward } = result.data;
                        set({
                            playerName,
                            playerAvatar,
                            xp,
                            streak,
                            lastLogin,
                            completedLevels: new Set(completedLevels),
                            unlockedAchievements: new Set(unlockedAchievements),
                            level: level || getLevelFromXP(xp),
                            levelProgress: getLevelProgress(xp),
                            levelTitle: getLevelTitle(level || getLevelFromXP(xp)),
                            showDailyReward: showDailyReward || false,
                            isLoaded: true,
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                }
            },

            addXP: async (amount) => {
                const newXP = get().xp + amount;
                set(() => ({
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
                const numId = Number(levelId);
                set((state) => {
                    const newCompleted = new Set(state.completedLevels);
                    newCompleted.add(numId);
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
                // Now handled by fetchUser on backend
            },

            dismissDailyReward: () => {
                set({ showDailyReward: false });
                // Mark as claimed in DB
                fetch('/api/user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ claimReward: true }),
                }).catch(err => console.error("Failed to sync reward claim:", err));
            },
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

