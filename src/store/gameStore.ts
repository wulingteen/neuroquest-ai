"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getLevelFromXP, getLevelProgress, getLevelTitle } from "@/lib/game/helpers";

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
    currentLevel: string | number | null;
    showDailyReward: boolean;
    hideBottomMenu: boolean;

    // Computed
    level: number;
    levelProgress: number;
    levelTitle: string;
    topScorer: {
        isTopScorer: boolean;
        hasMessageToday: boolean;
        lastMessage: string | null;
    };

    // Actions
    fetchUser: () => Promise<void>;
    addXP: (amount: number) => Promise<void>;
    completeLevel: (levelId: string | number) => Promise<void>;
    submitLevelQuizAnswers: (levelId: string | number, answers: { questionId: number, selectedOptionIndex: number }[]) => Promise<number>;
    unlockAchievement: (achievementId: string) => void;
    setCurrentPlanet: (planetId: string | null) => void;
    setCurrentLevel: (levelId: string | number | null) => void;
    checkDailyLogin: () => void;
    dismissDailyReward: () => void;
    setHideBottomMenu: (hide: boolean) => void;
    setTopScorerMessage: (message: string) => Promise<void>;
    fetchTopScorerStatus: () => Promise<void>;
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
            hideBottomMenu: false,
            level: 1,
            levelProgress: 0,
            levelTitle: getLevelTitle(1),
            topScorer: {
                isTopScorer: false,
                hasMessageToday: false,
                lastMessage: null,
            },

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
                        // Fetch top scorer status separately
                        await get().fetchTopScorerStatus();
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

                // Sync completion with DB (XP increment is handled by submitLevelQuizAnswers)
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

            submitLevelQuizAnswers: async (levelId, answers) => {
                try {
                    const response = await fetch('/api/quiz/answers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ levelId, answers }),
                    });
                    const result = await response.json();
                    if (result.success) {
                        const totalXpEarned = result.data.totalXpEarned;

                        // Sync XP in local state from server
                        await get().fetchUser();

                        return totalXpEarned;
                    }
                    return 0;
                } catch (error) {
                    console.error("Failed to submit quiz answers:", error);
                    return 0;
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
            setHideBottomMenu: (hide) => set({ hideBottomMenu: hide }),

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

            fetchTopScorerStatus: async () => {
                try {
                    const response = await fetch('/api/user/top-status');
                    const result = await response.json();
                    if (result.success) {
                        set({ topScorer: result.data });
                    }
                } catch (error) {
                    console.error("Failed to fetch top scorer status:", error);
                }
            },

            setTopScorerMessage: async (message: string) => {
                try {
                    const response = await fetch('/api/user/top-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message }),
                    });
                    const result = await response.json();
                    if (result.success) {
                        set((state) => ({
                            topScorer: { ...state.topScorer, hasMessageToday: true }
                        }));
                    }
                } catch (error) {
                    console.error("Failed to set top scorer message:", error);
                }
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

