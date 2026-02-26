"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { type LeaderboardEntry } from "@/types/game";
import { useGameStore } from "@/store/gameStore";
import { Trophy, Crown, Flame, Zap, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["全球榜", "本週榜", "好友榜"];

export default function LeaderboardPage() {
    const { playerName } = useGameStore();
    const [activeTab, setActiveTab] = useState(0);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch('/api/leaderboard');
                const result = await response.json();
                if (result.success) {
                    setLeaderboard(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            }
        };
        fetchLeaderboard();
    }, []);

    if (leaderboard.length === 0) return null;

    return (
        <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center neon-glow-gold">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black gradient-text" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            排行榜
                        </h1>
                        <p className="text-slate-400 text-sm">冠軍只有一個，你準備好了嗎？</p>
                    </div>
                </div>
            </motion.div>

            {/* Top 3 podium */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-end justify-center gap-3 mb-8"
            >
                {/* 2nd */}
                <div className="flex flex-col items-center">
                    <div className="glass-card p-4 text-center border border-slate-400/20 mb-2 w-32">
                        <div className="text-3xl mb-1">{leaderboard[1]?.avatar}</div>
                        <p className="text-xs font-bold text-white truncate">{leaderboard[1]?.name}</p>
                        <p className="text-xs text-yellow-400">{leaderboard[1]?.xp.toLocaleString()} XP</p>
                    </div>
                    <div className="w-20 h-20 bg-gradient-to-t from-slate-600/30 to-transparent rounded-t-lg flex items-center justify-center">
                        <span className="text-3xl">🥈</span>
                    </div>
                </div>

                {/* 1st */}
                <div className="flex flex-col items-center">
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        className="glass-card p-4 text-center border border-yellow-500/40 mb-2 w-36 neon-glow-gold"
                    >
                        <Crown className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                        <div className="text-4xl mb-1">{leaderboard[0]?.avatar}</div>
                        <p className="text-sm font-bold text-white truncate">{leaderboard[0]?.name}</p>
                        <p className="text-sm text-yellow-400 font-bold">{leaderboard[0]?.xp.toLocaleString()} XP</p>
                        <p className="text-xs text-slate-400">{leaderboard[0]?.guild}</p>
                    </motion.div>
                    <div className="w-24 h-28 bg-gradient-to-t from-yellow-500/20 to-transparent rounded-t-lg flex items-center justify-center">
                        <span className="text-4xl">🥇</span>
                    </div>
                </div>

                {/* 3rd */}
                <div className="flex flex-col items-center">
                    <div className="glass-card p-4 text-center border border-orange-700/20 mb-2 w-32">
                        <div className="text-3xl mb-1">{leaderboard[2]?.avatar}</div>
                        <p className="text-xs font-bold text-white truncate">{leaderboard[2]?.name}</p>
                        <p className="text-xs text-yellow-400">{leaderboard[2]?.xp.toLocaleString()} XP</p>
                    </div>
                    <div className="w-20 h-14 bg-gradient-to-t from-orange-900/30 to-transparent rounded-t-lg flex items-center justify-center">
                        <span className="text-3xl">🥉</span>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                {TABS.map((tab, i) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(i)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                            activeTab === i
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "text-slate-500 hover:text-slate-300 glass-card"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Full List */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-2">
                {leaderboard.map((entry, idx) => {
                    const isMe = entry.name === playerName || entry.name === "YouPlayer";
                    return (
                        <motion.div
                            key={entry.rank}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={cn(
                                "glass-card p-4 flex items-center gap-4 border transition-all",
                                isMe
                                    ? "border-purple-500/40 bg-purple-500/5 neon-glow-purple"
                                    : idx < 3
                                        ? "border-yellow-500/20"
                                        : "border-white/5"
                            )}
                        >
                            {/* Rank */}
                            <div className="w-10 text-center shrink-0">
                                {idx === 0 ? (
                                    <Crown className="w-6 h-6 text-yellow-400 mx-auto" />
                                ) : idx === 1 ? (
                                    <span className="text-xl">🥈</span>
                                ) : idx === 2 ? (
                                    <span className="text-xl">🥉</span>
                                ) : (
                                    <span className="text-lg font-black text-slate-500">#{entry.rank}</span>
                                )}
                            </div>

                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xl">
                                {entry.avatar}
                            </div>

                            {/* Name + guild */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={cn("font-bold text-sm truncate", isMe ? "text-purple-300" : "text-white")}>
                                        {entry.name}
                                        {isMe && " (你)"}
                                    </p>
                                    {entry.guild && (
                                        <span className="text-xs bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded hidden sm:inline">
                                            {entry.guild}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-slate-500 flex items-center gap-0.5">
                                        <Star className="w-3 h-3 text-purple-400" />
                                        Lv.{entry.level}
                                    </span>
                                    <span className="text-xs text-orange-400 flex items-center gap-0.5">
                                        <Flame className="w-3 h-3" />
                                        {entry.streak}天
                                    </span>
                                </div>
                            </div>

                            {/* XP */}
                            <div className="text-right shrink-0">
                                <p className="font-black text-yellow-400 flex items-center gap-1 text-sm">
                                    <Zap className="w-3 h-3" />
                                    {entry.xp.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-600">XP</p>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Guild Leaderboard teaser */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 glass-card p-5 border border-blue-500/20 bg-blue-500/5"
            >
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-400" />
                    <div className="flex-1">
                        <p className="font-bold text-white">🏰 公會排行榜</p>
                        <p className="text-xs text-slate-400">加入公會，一起爭奪公會週冠軍！</p>
                    </div>
                    <button className="btn-primary text-sm px-4 py-2">加入公會</button>
                </div>
            </motion.div>
        </div>
    );
}
