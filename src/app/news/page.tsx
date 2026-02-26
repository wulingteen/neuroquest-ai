"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import {
    Newspaper,
    Zap,
    ChevronRight,
    Star,
    ExternalLink,
    Loader2,
    AlertCircle,
    BookOpen,
    ChevronDown,
    ChevronUp,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type NewsItem, type QuizQuestion } from "@/types/game";
import ProfileSetupModal from "@/components/ProfileSetupModal";

// Tier labels for filter pills
const TIER_META: Record<
    number,
    { label: string; color: string }
> = {
    1: { label: "入門", color: "#10B981" },
    2: { label: "基礎", color: "#3B82F6" },
    3: { label: "進階", color: "#8B5CF6" },
    4: { label: "高階", color: "#F97316" },
    5: { label: "專家", color: "#EF4444" },
};

export default function NewsPage() {
    const { addXP } = useGameStore();
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [cycleDate, setCycleDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [readItems, setReadItems] = useState<Set<string>>(new Set());
    const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<
        Record<string, { questionId: number; answer: number; answered: boolean }>
    >({});
    const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
    const [filterTier, setFilterTier] = useState<number | null>(null);

    // Profile setup state
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [profileChecked, setProfileChecked] = useState(false);
    const [difficultyScore, setDifficultyScore] = useState<number | null>(null);

    // Check if user has a profile
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/user/profile");
                const data = await res.json();
                if (data.success && data.exists) {
                    setDifficultyScore(data.profile.difficulty_score);
                    setProfileChecked(true);
                } else {
                    // No profile — show setup modal
                    setShowProfileSetup(true);
                }
            } catch {
                // On error, skip the modal and just load news
                setProfileChecked(true);
            }
        })();
    }, []);

    // Fetch news from API (only after profile is checked)
    const fetchNews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/news/selections");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setNewsItems(data.items ?? []);
            setCycleDate(data.cycle_date ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load news");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (profileChecked) {
            fetchNews();
        }
    }, [profileChecked, fetchNews]);

    const filteredItems = filterTier
        ? newsItems.filter((n) => n.tier === filterTier)
        : newsItems;

    const handleRead = (id: string) => {
        if (!readItems.has(id)) {
            setReadItems((prev) => new Set([...prev, id]));
        }
        setActiveQuiz(id);
    };

    const handleQuizAnswer = (newsId: string, questionIdx: number, optionIdx: number) => {
        const key = `${newsId}-${questionIdx}`;
        if (quizAnswers[key]?.answered) return;

        const news = newsItems.find((n) => n.id === newsId);
        if (!news?.questions?.[questionIdx]) return;

        const question = news.questions[questionIdx];
        const isCorrect = optionIdx === question.correct;

        setQuizAnswers((prev) => ({
            ...prev,
            [key]: { questionId: question.id, answer: optionIdx, answered: true },
        }));

        if (isCorrect) {
            addXP(question.xp);
        }
    };

    const toggleArticle = (id: string) => {
        setExpandedArticle((prev) => (prev === id ? null : id));
    };

    // Handle profile setup completion
    const handleProfileComplete = (score: number) => {
        setDifficultyScore(score);
        setShowProfileSetup(false);
        setProfileChecked(true);
    };

    // Show profile setup modal (blocks everything else)
    if (showProfileSetup) {
        return (
            <ProfileSetupModal
                open={showProfileSetup}
                onComplete={handleProfileComplete}
            />
        );
    }

    // Still checking profile
    if (!profileChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                    <p className="text-slate-400 text-sm">檢查個人設定…</p>
                </motion.div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                    <p className="text-slate-400 text-sm">載入新聞中…</p>
                </motion.div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 border border-red-500/20 text-center max-w-md"
                >
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-white font-bold text-lg mb-2">載入失敗</h2>
                    <p className="text-slate-400 text-sm mb-6">{error}</p>
                    <button
                        onClick={fetchNews}
                        className="btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-2 cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                        重新載入
                    </button>
                </motion.div>
            </div>
        );
    }

    // Empty state
    if (newsItems.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 border border-white/10 text-center max-w-md"
                >
                    <Newspaper className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h2 className="text-white font-bold text-lg mb-2">尚無新聞</h2>
                    <p className="text-slate-400 text-sm">
                        目前還沒有精選新聞。系統會定期掃描並更新最新 AI 動態，請稍後再來查看！
                    </p>
                </motion.div>
            </div>
        );
    }

    const totalReward = newsItems.reduce((a, n) => a + n.reward, 0);

    return (
        <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1
                            className="text-3xl font-black gradient-text"
                            style={{ fontFamily: "Orbitron, sans-serif" }}
                        >
                            GenAI 快訊
                        </h1>
                        <p className="text-slate-400 text-sm">
                            閱讀最新動態，回答問題得 XP
                            {cycleDate && (
                                <span className="ml-2 text-slate-600">· {cycleDate}</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Summary stats */}
                <div className="flex gap-3 mt-4 flex-wrap">
                    <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-purple-400" />
                        <span className="text-slate-300">
                            {readItems.size}/{newsItems.length} 已閱讀
                        </span>
                    </div>
                    <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-300">最多可得 {totalReward} XP</span>
                    </div>
                </div>

                {/* Tier filter pills */}
                <div className="flex gap-2 mt-4 flex-wrap">
                    <button
                        onClick={() => setFilterTier(null)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border",
                            filterTier === null
                                ? "bg-white/15 border-white/30 text-white"
                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        )}
                    >
                        全部
                    </button>
                    {Object.entries(TIER_META).map(([tier, meta]) => (
                        <button
                            key={tier}
                            onClick={() => setFilterTier(Number(tier))}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border",
                                filterTier === Number(tier)
                                    ? "text-white"
                                    : "text-slate-400 hover:opacity-80"
                            )}
                            style={{
                                borderColor:
                                    filterTier === Number(tier)
                                        ? meta.color
                                        : "rgba(255,255,255,0.1)",
                                background:
                                    filterTier === Number(tier)
                                        ? `${meta.color}22`
                                        : "rgba(255,255,255,0.03)",
                                color:
                                    filterTier === Number(tier)
                                        ? meta.color
                                        : undefined,
                            }}
                        >
                            {meta.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* News list */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredItems.map((news, idx) => {
                        const isRead = readItems.has(news.id);
                        const isActive = activeQuiz === news.id;
                        const isExpanded = expandedArticle === news.id;
                        const questions = news.questions ?? [];

                        return (
                            <motion.div
                                key={news.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: idx * 0.06 }}
                                className={cn(
                                    "glass-card border overflow-hidden transition-all",
                                    isRead ? "border-green-500/20" : "border-white/10",
                                    isActive && "border-cyan-500/30"
                                )}
                            >
                                {/* Category bar */}
                                <div
                                    className="h-1 w-full"
                                    style={{ background: news.categoryColor }}
                                />

                                <div className="p-5">
                                    {/* Meta */}
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <span
                                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                                            style={{
                                                background: `${news.categoryColor}22`,
                                                color: news.categoryColor,
                                            }}
                                        >
                                            Tier {news.tier} · {news.category}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {news.source}
                                        </span>
                                        <span className="text-xs text-slate-700">·</span>
                                        <span className="text-xs text-slate-500">
                                            {news.date}
                                        </span>
                                        {isRead && (
                                            <span className="ml-auto text-xs text-green-400">
                                                ✓ 已閱讀
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-bold text-white mb-2 leading-snug">
                                        {news.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                        {news.summary}
                                    </p>

                                    {/* Embedded article link */}
                                    <div className="mb-4">
                                        <button
                                            onClick={() => toggleArticle(news.id)}
                                            className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            <span>閱讀原文</span>
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="mt-3 overflow-hidden"
                                                >
                                                    <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                                                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/5">
                                                            <span className="text-xs text-slate-400 truncate max-w-[70%]">
                                                                {news.url}
                                                            </span>
                                                            <a
                                                                href={news.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                                新分頁開啟
                                                            </a>
                                                        </div>
                                                        <iframe
                                                            src={news.url}
                                                            title={news.title}
                                                            className="w-full border-0"
                                                            style={{
                                                                height: "420px",
                                                                colorScheme: "auto",
                                                            }}
                                                            sandbox="allow-scripts allow-same-origin allow-popups"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* CTA / Quiz */}
                                    {!isActive ? (
                                        <button
                                            onClick={() => handleRead(news.id)}
                                            className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors group cursor-pointer"
                                        >
                                            <span>
                                                {isRead ? "查看知識測驗" : "開始答題"}
                                            </span>
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            <span className="text-yellow-400 flex items-center gap-0.5 ml-2">
                                                <Zap className="w-3 h-3" />+
                                                {news.reward} XP
                                            </span>
                                        </button>
                                    ) : (
                                        /* Quiz section — render all questions */
                                        <AnimatePresence>
                                            {questions.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    className="border-t border-white/10 pt-4 mt-2 space-y-6"
                                                >
                                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-purple-400" />
                                                        知識小測驗 ({questions.length} 題)
                                                    </p>

                                                    {questions.map(
                                                        (
                                                            question: QuizQuestion,
                                                            qIdx: number
                                                        ) => {
                                                            const key = `${news.id}-${qIdx}`;
                                                            const state = quizAnswers[key];
                                                            const answered = state?.answered ?? false;
                                                            const selectedAnswer = state?.answer ?? null;

                                                            return (
                                                                <div key={qIdx} className="space-y-2.5">
                                                                    <p className="text-sm text-slate-300">
                                                                        <span className="text-purple-400 font-bold mr-2">
                                                                            Q{qIdx + 1}.
                                                                        </span>
                                                                        {question.question}
                                                                    </p>
                                                                    <div className="space-y-2">
                                                                        {question.options.map(
                                                                            (opt, i) => {
                                                                                const isCorrect =
                                                                                    i ===
                                                                                    question.correct;
                                                                                const isSelected =
                                                                                    i ===
                                                                                    selectedAnswer;
                                                                                return (
                                                                                    <button
                                                                                        key={i}
                                                                                        onClick={() =>
                                                                                            handleQuizAnswer(
                                                                                                news.id,
                                                                                                qIdx,
                                                                                                i
                                                                                            )
                                                                                        }
                                                                                        disabled={answered}
                                                                                        className={cn(
                                                                                            "w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all cursor-pointer",
                                                                                            !answered &&
                                                                                            "hover:border-purple-500/30 hover:bg-purple-500/5 border-white/10 glass-card",
                                                                                            answered &&
                                                                                            isCorrect &&
                                                                                            "border-green-500/50 bg-green-500/10 text-green-300",
                                                                                            answered &&
                                                                                            isSelected &&
                                                                                            !isCorrect &&
                                                                                            "border-red-500/50 bg-red-500/10 text-red-300",
                                                                                            answered &&
                                                                                            !isSelected &&
                                                                                            !isCorrect &&
                                                                                            "opacity-30 border-white/5",
                                                                                            answered &&
                                                                                            "cursor-default"
                                                                                        )}
                                                                                    >
                                                                                        {opt}
                                                                                    </button>
                                                                                );
                                                                            }
                                                                        )}
                                                                    </div>
                                                                    {answered && (
                                                                        <motion.div
                                                                            initial={{
                                                                                opacity: 0,
                                                                                y: 5,
                                                                            }}
                                                                            animate={{
                                                                                opacity: 1,
                                                                                y: 0,
                                                                            }}
                                                                            className="mt-2 space-y-1"
                                                                        >
                                                                            <p
                                                                                className={cn(
                                                                                    "text-sm font-bold flex items-center gap-2",
                                                                                    selectedAnswer ===
                                                                                        question.correct
                                                                                        ? "text-green-400"
                                                                                        : "text-slate-400"
                                                                                )}
                                                                            >
                                                                                {selectedAnswer ===
                                                                                    question.correct ? (
                                                                                    <>
                                                                                        <Zap className="w-4 h-4 text-yellow-400" />
                                                                                        答對了！+
                                                                                        {question.xp}{" "}
                                                                                        XP
                                                                                    </>
                                                                                ) : (
                                                                                    "答錯了，繼續加油！"
                                                                                )}
                                                                            </p>
                                                                            {question.explanation && (
                                                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                                                    💡{" "}
                                                                                    {
                                                                                        question.explanation
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                        </motion.div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 text-center text-xs text-slate-600 pb-8"
            >
                新聞由 RSS 自動掃描 · LLM 精選 · 每日更新
            </motion.div>
        </div>
    );
}
