"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { getLevelTitle, type Achievement } from "@/lib/gameData";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import { Star, Zap, Flame, Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";

const RARITY_LABELS: Record<string, string> = {
    common: "普通",
    rare: "稀有",
    epic: "史詩",
    legendary: "傳說",
};

export default function LabPage() {
    const { xp, level, streak, playerName, playerAvatar, levelTitle, levelProgress, unlockedAchievements } = useGameStore();
    const [achievements, setAchievements] = useState<Achievement[]>([]);

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const response = await fetch('/api/achievements');
                const result = await response.json();
                if (result.success) {
                    setAchievements(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch achievements:", error);
            }
        };
        fetchAchievements();
    }, []);

    const petStage = level >= 20 ? "🤖" : level >= 10 ? "🌱" : level >= 5 ? "🐣" : "🥚";
    const petName = level >= 20 ? "Alpha AI" : level >= 10 ? "小Neuro" : level >= 5 ? "AI幼苗" : "神秘AI蛋";

    return (
        <div className="min-h-screen px-4 py-6 max-w-5xl mx-auto">
            {/* Header / Back Button */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex">
                <Link href="/" className="bg-white/15 backdrop-blur-xl border border-white/10 p-2 sm:p-2.5 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white/20 shadow-md">
                    <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </Link>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-5">
                {/* Player card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-1 glass-card p-6 border border-purple-500/20 text-center"
                >
                    {/* Avatar */}
                    <div className="relative w-24 h-24 mx-auto mb-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-5xl neon-glow-purple">
                            {playerAvatar}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-yellow-400 to-orange-500 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white border-2 border-[#0D0D2B]">
                            {level}
                        </div>
                    </div>

                    <h2 className="text-xl font-black text-white mb-0.5">{playerName}</h2>
                    <p className="text-sm text-purple-400 mb-4">{levelTitle}</p>

                    {/* XP Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>等級 {level}</span>
                            <span className="text-yellow-400">{xp.toLocaleString()} XP</span>
                        </div>
                        <div className="xp-bar-track">
                            <div className="xp-bar-fill" style={{ width: `${levelProgress}%` }} />
                        </div>
                        <p className="text-xs text-slate-600 mt-1">下一等級頭銜：{getLevelTitle(level + 1)}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="glass-card p-3 text-center">
                            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                            <p className="font-black text-orange-300 text-lg">{streak}</p>
                            <p className="text-xs text-slate-500">連勝天數</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                            <p className="font-black text-yellow-300 text-lg">{unlockedAchievements.size}</p>
                            <p className="text-xs text-slate-500">成就數量</p>
                        </div>
                    </div>
                </motion.div>

                {/* Main content */}
                <div className="md:col-span-2 space-y-5">
                    {/* AI Pet */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-5 border border-cyan-500/20"
                    >
                        <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            🤖 AI 助手寵物
                            <span className="text-xs text-slate-500 font-normal ml-auto">隨等級進化</span>
                        </p>
                        <div className="flex items-center gap-5">
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                className="text-7xl"
                            >
                                {petStage}
                            </motion.div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-cyan-300">{petName}</h3>
                                <p className="text-xs text-slate-400 mb-3">
                                    {level < 5
                                        ? "繼續學習，讓 AI 寵物孵化！達到 Lv.5 解鎖"
                                        : level < 10
                                            ? "你的 AI 寵物正在成長！達到 Lv.10 進一步進化"
                                            : level < 20
                                                ? "AI 小苗茁壯中！達到 Lv.20 完全進化"
                                                : "AI 已完全進化！它能給你每日學習建議 🎉"}
                                </p>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>進化進度</span>
                                        <span>{Math.min(level, 20)} / 20 等</span>
                                    </div>
                                    <div className="xp-bar-track">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${Math.min((level / 20) * 100, 100)}%`,
                                                background: "linear-gradient(90deg, #00D4FF, #10B981)",
                                                boxShadow: "0 0 10px rgba(0,212,255,0.6)",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Achievements */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-5"
                    >
                        <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            成就館
                            <span className="ml-auto text-xs text-slate-500">
                                {unlockedAchievements.size}/{achievements.length} 解鎖
                            </span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {achievements.map((ach, idx) => {
                                const unlocked = unlockedAchievements.has(ach.id);
                                return (
                                    <motion.div
                                        key={ach.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.07 }}
                                        className={cn(
                                            "glass-card p-3 text-center border transition-all",
                                            `rarity-bg-${ach.rarity}`,
                                            unlocked ? `rarity-${ach.rarity}` : "border-white/5 opacity-50 grayscale"
                                        )}
                                    >
                                        <div className="text-3xl mb-2">{unlocked ? ach.icon : "🔒"}</div>
                                        <p className={cn("text-xs font-bold mb-0.5", unlocked ? "" : "text-slate-600")}>{ach.name}</p>
                                        <p className="text-xs text-slate-600 mb-1 line-clamp-2">{ach.description}</p>
                                        <span className={cn(
                                            "text-xs px-1.5 py-0.5 rounded-full border",
                                            unlocked ? `rarity-${ach.rarity}` : "text-slate-700 border-slate-800"
                                        )}>
                                            {RARITY_LABELS[ach.rarity]}
                                        </span>
                                        {unlocked && (
                                            <p className="text-xs text-yellow-400 mt-1 flex items-center justify-center gap-0.5">
                                                <Zap className="w-2.5 h-2.5" />
                                                {ach.xpReward} XP
                                            </p>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Lab Upgrades */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-5 border border-yellow-500/10"
                    >
                        <p className="text-sm font-bold text-white mb-3">🏗️ 實驗室設施</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { name: "量子電腦", icon: "💻", unlocked: level >= 5, req: "Lv.5" },
                                { name: "神經網路伺服器", icon: "🖥️", unlocked: level >= 10, req: "Lv.10" },
                                { name: "AI 訓練平台", icon: "⚡", unlocked: level >= 15, req: "Lv.15" },
                                { name: "多模態實驗艙", icon: "👁️", unlocked: level >= 20, req: "Lv.20" },
                                { name: "自主 Agent 巢", icon: "🤖", unlocked: level >= 25, req: "Lv.25" },
                                { name: "AGI 研究室", icon: "🌟", unlocked: level >= 30, req: "Lv.30" },
                            ].map((facility) => (
                                <div
                                    key={facility.name}
                                    className={cn(
                                        "glass-card p-3 text-center border",
                                        facility.unlocked ? "border-green-500/20 bg-green-500/5" : "border-white/5 opacity-40"
                                    )}
                                >
                                    <div className="text-2xl mb-1">{facility.unlocked ? facility.icon : "🔒"}</div>
                                    <p className="text-xs font-medium text-slate-400 leading-tight">{facility.name}</p>
                                    {!facility.unlocked && (
                                        <p className="text-xs text-slate-600 mt-1">{facility.req} 解鎖</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
