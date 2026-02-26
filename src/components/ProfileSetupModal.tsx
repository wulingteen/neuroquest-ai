"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    User,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Check,
    Loader2,
    Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ProfileOption } from "@/types/game";

interface ProfileSetupModalProps {
    open: boolean;
    onComplete: (score: number) => void;
}

type Step = "background" | "interests" | "result";

export default function ProfileSetupModal({
    open,
    onComplete,
}: ProfileSetupModalProps) {
    const [step, setStep] = useState<Step>("background");
    const [backgrounds, setBackgrounds] = useState<ProfileOption[]>([]);
    const [interests, setInterests] = useState<ProfileOption[]>([]);
    const [selectedBg, setSelectedBg] = useState<string | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
        new Set()
    );
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [resultScore, setResultScore] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch options from API
    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/user/profile/options");
                const data = await res.json();
                if (!data.success) throw new Error(data.error);
                setBackgrounds(data.backgrounds);
                setInterests(data.interests);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to load options"
                );
            } finally {
                setLoading(false);
            }
        })();
    }, [open]);

    const toggleInterest = (key: string) => {
        setSelectedInterests((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!selectedBg || selectedInterests.size === 0) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/user/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    background: selectedBg,
                    interests: Array.from(selectedInterests),
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setResultScore(data.difficulty_score);
            setStep("result");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save profile");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinish = () => {
        if (resultScore !== null) {
            onComplete(resultScore);
        }
    };

    // Score level label
    const getScoreLabel = (score: number) => {
        if (score <= 20) return { label: "入門", color: "#10B981", tier: 1 };
        if (score <= 40) return { label: "基礎", color: "#3B82F6", tier: 2 };
        if (score <= 60) return { label: "進階", color: "#8B5CF6", tier: 3 };
        if (score <= 80) return { label: "高階", color: "#F97316", tier: 4 };
        return { label: "專家", color: "#EF4444", tier: 5 };
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border border-white/10"
                    style={{
                        background:
                            "linear-gradient(145deg, rgba(13,13,43,0.97) 0%, rgba(20,10,50,0.97) 100%)",
                        boxShadow:
                            "0 0 60px rgba(139,92,246,0.15), 0 0 20px rgba(0,212,255,0.1)",
                    }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 px-6 pt-6 pb-4 border-b border-white/5 bg-inherit">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                                {step === "result" ? (
                                    <Target className="w-5 h-5 text-white" />
                                ) : (
                                    <User className="w-5 h-5 text-white" />
                                )}
                            </div>
                            <div>
                                <h2
                                    className="text-lg font-black text-white"
                                    style={{ fontFamily: "Orbitron, sans-serif" }}
                                >
                                    {step === "background" && "你的背景"}
                                    {step === "interests" && "興趣領域"}
                                    {step === "result" && "設定完成！"}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {step === "background" &&
                                        "告訴我們你的身份，以推薦最適合的內容"}
                                    {step === "interests" &&
                                        "選擇你感興趣的 AI 領域（至少 1 個）"}
                                    {step === "result" &&
                                        "系統已為你計算個人化難度"}
                                </p>
                            </div>
                        </div>

                        {/* Step indicator */}
                        {step !== "result" && (
                            <div className="flex gap-2 mt-3">
                                {(["background", "interests"] as const).map(
                                    (s, i) => (
                                        <div
                                            key={s}
                                            className="flex-1 h-1 rounded-full transition-all duration-300"
                                            style={{
                                                background:
                                                    step === s ||
                                                        (s === "background" &&
                                                            step === "interests")
                                                        ? "linear-gradient(90deg, #8B5CF6, #00D4FF)"
                                                        : "rgba(255,255,255,0.08)",
                                            }}
                                        >
                                            <span className="sr-only">
                                                Step {i + 1}
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                <p className="text-slate-400 text-sm">
                                    載入選項中…
                                </p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                {/* Step 1: Background */}
                                {step === "background" && (
                                    <motion.div
                                        key="bg"
                                        initial={{ opacity: 0, x: 40 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -40 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-2"
                                    >
                                        {backgrounds.map((opt) => (
                                            <button
                                                key={opt.key}
                                                onClick={() =>
                                                    setSelectedBg(opt.key)
                                                }
                                                className={cn(
                                                    "w-full text-left px-4 py-3.5 rounded-xl border transition-all cursor-pointer group",
                                                    selectedBg === opt.key
                                                        ? "border-purple-500/50 bg-purple-500/10"
                                                        : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl shrink-0">
                                                        {opt.icon}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white text-sm">
                                                                {opt.label}
                                                            </span>
                                                            {selectedBg ===
                                                                opt.key && (
                                                                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                                                                )}
                                                        </div>
                                                        {opt.description && (
                                                            <p className="text-xs text-slate-500 mt-0.5">
                                                                {opt.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}

                                {/* Step 2: Interests */}
                                {step === "interests" && (
                                    <motion.div
                                        key="int"
                                        initial={{ opacity: 0, x: 40 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -40 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-2"
                                    >
                                        {interests.map((opt) => {
                                            const selected =
                                                selectedInterests.has(opt.key);
                                            return (
                                                <button
                                                    key={opt.key}
                                                    onClick={() =>
                                                        toggleInterest(opt.key)
                                                    }
                                                    className={cn(
                                                        "w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer",
                                                        selected
                                                            ? "border-cyan-500/50 bg-cyan-500/10"
                                                            : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl shrink-0">
                                                            {opt.icon}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white text-sm">
                                                                    {opt.label}
                                                                </span>
                                                                {selected && (
                                                                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                                                                )}
                                                            </div>
                                                            {opt.description && (
                                                                <p className="text-xs text-slate-500 mt-0.5">
                                                                    {
                                                                        opt.description
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}

                                {/* Step 3: Result */}
                                {step === "result" && resultScore !== null && (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center py-8 gap-5"
                                    >
                                        {/* Animated score circle */}
                                        <div className="relative w-36 h-36">
                                            <svg
                                                viewBox="0 0 120 120"
                                                className="w-full h-full -rotate-90"
                                            >
                                                <circle
                                                    cx="60"
                                                    cy="60"
                                                    r="52"
                                                    fill="none"
                                                    stroke="rgba(255,255,255,0.06)"
                                                    strokeWidth="8"
                                                />
                                                <motion.circle
                                                    cx="60"
                                                    cy="60"
                                                    r="52"
                                                    fill="none"
                                                    stroke={`url(#scoreGrad)`}
                                                    strokeWidth="8"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${2 * Math.PI * 52
                                                        }`}
                                                    initial={{
                                                        strokeDashoffset:
                                                            2 * Math.PI * 52,
                                                    }}
                                                    animate={{
                                                        strokeDashoffset:
                                                            2 *
                                                            Math.PI *
                                                            52 *
                                                            (1 -
                                                                resultScore /
                                                                100),
                                                    }}
                                                    transition={{
                                                        duration: 1.2,
                                                        ease: "easeOut",
                                                        delay: 0.3,
                                                    }}
                                                />
                                                <defs>
                                                    <linearGradient
                                                        id="scoreGrad"
                                                        x1="0"
                                                        y1="0"
                                                        x2="1"
                                                        y2="1"
                                                    >
                                                        <stop
                                                            offset="0%"
                                                            stopColor={
                                                                getScoreLabel(
                                                                    resultScore
                                                                ).color
                                                            }
                                                        />
                                                        <stop
                                                            offset="100%"
                                                            stopColor="#00D4FF"
                                                        />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <motion.span
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                    className="text-3xl font-black text-white"
                                                    style={{
                                                        fontFamily:
                                                            "Orbitron, sans-serif",
                                                    }}
                                                >
                                                    {resultScore}
                                                </motion.span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                                                    分數
                                                </span>
                                            </div>
                                        </div>

                                        {/* Tier badge */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6 }}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full border"
                                            style={{
                                                borderColor: `${getScoreLabel(resultScore).color}44`,
                                                background: `${getScoreLabel(resultScore).color}15`,
                                            }}
                                        >
                                            <Sparkles
                                                className="w-4 h-4"
                                                style={{
                                                    color: getScoreLabel(
                                                        resultScore
                                                    ).color,
                                                }}
                                            />
                                            <span
                                                className="text-sm font-bold"
                                                style={{
                                                    color: getScoreLabel(
                                                        resultScore
                                                    ).color,
                                                }}
                                            >
                                                推薦難度：
                                                {
                                                    getScoreLabel(resultScore)
                                                        .label
                                                }
                                            </span>
                                        </motion.div>

                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.8 }}
                                            className="text-sm text-slate-400 text-center max-w-xs leading-relaxed"
                                        >
                                            系統將根據你的分數，優先推薦
                                            <span
                                                className="font-bold"
                                                style={{
                                                    color: getScoreLabel(
                                                        resultScore
                                                    ).color,
                                                }}
                                            >
                                                {" "}
                                                Tier{" "}
                                                {
                                                    getScoreLabel(resultScore)
                                                        .tier
                                                }{" "}
                                            </span>
                                            難度的新聞文章給你閱讀
                                        </motion.p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Footer */}
                    {!loading && !error && (
                        <div className="sticky bottom-0 px-6 py-4 border-t border-white/5 bg-inherit flex items-center justify-between gap-3">
                            {step === "background" && (
                                <>
                                    <div />
                                    <button
                                        onClick={() => setStep("interests")}
                                        disabled={!selectedBg}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer",
                                            selectedBg
                                                ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/20"
                                                : "bg-white/5 text-slate-500 cursor-not-allowed"
                                        )}
                                    >
                                        下一步
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </>
                            )}

                            {step === "interests" && (
                                <>
                                    <button
                                        onClick={() => setStep("background")}
                                        className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        返回
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={
                                            selectedInterests.size === 0 ||
                                            submitting
                                        }
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer",
                                            selectedInterests.size > 0 &&
                                                !submitting
                                                ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/20"
                                                : "bg-white/5 text-slate-500 cursor-not-allowed"
                                        )}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                計算中…
                                            </>
                                        ) : (
                                            <>
                                                確認
                                                <Check className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </>
                            )}

                            {step === "result" && (
                                <>
                                    <div />
                                    <motion.button
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1.0 }}
                                        onClick={handleFinish}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer"
                                    >
                                        開始閱讀
                                        <Sparkles className="w-4 h-4" />
                                    </motion.button>
                                </>
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
