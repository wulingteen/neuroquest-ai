"use client";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { Gift, Zap, Flame, X } from "lucide-react";

export default function DailyRewardModal() {
    const { streak, dismissDailyReward, addXP } = useGameStore();

    const reward = streak >= 7 ? 300 : streak >= 3 ? 150 : 50;
    const isDouble = streak >= 3;

    const handleClaim = () => {
        addXP(reward);
        dismissDailyReward();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
            <motion.div
                initial={{ scale: 0.7, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="glass-card w-full max-w-sm neon-glow-gold text-center p-8 relative"
            >
                <button
                    onClick={dismissDailyReward}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Animated gift */}
                <div className="text-7xl mb-4 animate-float">🎁</div>

                <div className="flex items-center justify-center gap-2 mb-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <span className="text-xl font-black text-orange-300">{streak} 天連勝！</span>
                    <Flame className="w-5 h-5 text-orange-400" />
                </div>

                <h2 className="text-2xl font-black gradient-text mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    每日登入獎勵
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                    {isDouble ? "🔥 連勝加乘！獎勵翻倍" : "明天繼續，獎勵更多！"}
                </p>

                {/* Reward cards */}
                <div className="glass-card p-4 mb-6">
                    <div className="flex items-center justify-center gap-3">
                        <Gift className="w-8 h-8 text-purple-400" />
                        <div className="text-left">
                            <p className="text-3xl font-black text-yellow-400 flex items-center gap-1">
                                <Zap className="w-6 h-6" />
                                +{reward} XP
                            </p>
                            {isDouble && (
                                <p className="text-xs text-slate-500 line-through">原始: {reward / 2} XP</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Streak milestones */}
                <div className="flex justify-between mb-6 text-xs">
                    {[1, 3, 7].map((day) => (
                        <div
                            key={day}
                            className={`text-center p-2 rounded-lg flex-1 mx-1 ${streak >= day ? "bg-orange-500/20 text-orange-300" : "bg-white/5 text-slate-600"}`}
                        >
                            <p className="font-bold">{day}天</p>
                            <p>{day === 1 ? "50XP" : day === 3 ? "150XP" : "300XP"}</p>
                        </div>
                    ))}
                </div>

                <button className="btn-primary w-full text-lg py-4" onClick={handleClaim}>
                    🎯 領取獎勵！
                </button>
            </motion.div>
        </motion.div>
    );
}
