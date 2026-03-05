"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import FomoBird from "@/components/icons/FomoBird";
import {
    Flame,
    Zap,
    ChevronLeft,
    ArrowRight,
    CircleDashed,
    RefreshCw,
    ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { type NewsItem } from "@/types/game";
import ProfileSetupModal from "./_components/ProfileSetupModal";
import BackgroundGraphics from "./_components/BackgroundGraphics";
import {
    QuizOptionList,
    QuizConfirmButton,
    QuizResultBanner,
    QuizExitConfirm,
    QuizProgressBar,
} from "@/components/quiz";

/**
 * KURZGESAGT STYLE NEWS PAGE
 * Vibrant colors, bold typography, and smooth shapes.
 */

const TIER_STYLES: Record<number, {
    card: string;
    iconBg: string;
    title: string;
    xp: string;
    sector: string;
    border: string;
}> = {
    1: {
        card: "bg-[#f0f9ff]",
        iconBg: "bg-[#00D4FF]",
        title: "text-[#0369a1]",
        xp: "text-[#0284c7]",
        sector: "text-[#00D4FF]/60",
        border: "border-[#00D4FF]"
    },
    2: {
        card: "bg-[#f7fee7]",
        iconBg: "bg-[#58cc02]",
        title: "text-[#3f6212]",
        xp: "text-[#65a30d]",
        sector: "text-[#58cc02]/60",
        border: "border-[#58cc02]"
    },
    3: {
        card: "bg-[#fffbeb]",
        iconBg: "bg-[#FFB800]",
        title: "text-[#92400e]",
        xp: "text-[#d97706]",
        sector: "text-[#FFB800]/60",
        border: "border-[#FFB800]"
    },
    4: {
        card: "bg-[#fff7ed]",
        iconBg: "bg-[#ff9600]",
        title: "text-[#9a3412]",
        xp: "text-[#ea580c]",
        sector: "text-[#ff9600]/60",
        border: "border-[#ff9600]"
    },
    5: {
        card: "bg-[#fff1f2]",
        iconBg: "bg-[#FF1E56]",
        title: "text-[#9f1239]",
        xp: "text-[#e11d48]",
        sector: "text-[#FF1E56]/60",
        border: "border-[#FF1E56]"
    },
};

type Phase = "hub" | "read" | "quiz" | "completed";

export default function NewsPage() {
    const router = useRouter();
    const { xp, level, levelProgress, addXP, streak, fetchUser, setHideBottomMenu } = useGameStore();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

    // Flow State
    const [phase, setPhase] = useState<Phase>("hub");
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [quizIndex, setQuizIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<{ questionId: number; selectedOptionIndex: number; isCorrect: boolean }[]>([]);
    const [earnedXP, setEarnedXP] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [articleOpened, setArticleOpened] = useState(false);

    // Onboarding
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Reset bottom menu visibility on unmount (e.g. browser back)
    useEffect(() => {
        return () => setHideBottomMenu(false);
    }, [setHideBottomMenu]);

    // Memoize sorted news and top reward IDs
    const { sortedNews, top3Ids } = useMemo(() => {
        const top3 = [...news]
            .sort((a, b) => b.reward - a.reward)
            .slice(0, 3)
            .map((n) => n.id);
        const sorted = news
            .map((item, idx) => ({ item, originalIndex: idx }))
            .sort((a, b) => {
                const aDone = completedIds.has(a.item.id) ? 1 : 0;
                const bDone = completedIds.has(b.item.id) ? 1 : 0;
                return aDone - bDone;
            });
        return { sortedNews: sorted, top3Ids: top3 };
    }, [news, completedIds]);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch("/api/user/profile");
                const data = await res.json();
                if (data.success && data.exists) {
                    fetchNews(data.profile.difficulty_score);
                } else {
                    setShowOnboarding(true);
                    setLoading(false);
                }
            } catch {
                setError("Connection issue");
                setLoading(false);
            }
        };
        init();
    }, []);

    const fetchNews = async (score: number) => {
        setLoading(true);
        try {
            const tier =
                score <= 20
                    ? 1
                    : score <= 40
                        ? 2
                        : score <= 60
                            ? 3
                            : score <= 80
                                ? 4
                                : 5;
            const res = await fetch(`/api/news/selections?maxTier=${tier}`);
            const data = await res.json();
            const items: NewsItem[] = data.items || [];
            setNews(items);

            // Initialize completedIds from server data so completed quizzes
            // persist across page refreshes
            const doneIds = new Set(
                items.filter((item) => item.completed).map((item) => item.id),
            );
            setCompletedIds(doneIds);
        } catch {
            setError("Failed to fetch stories");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectNews = (item: NewsItem) => {
        setSelectedNews(item);
        setArticleOpened(false);
        setPhase("read");
    };

    const handleStartQuiz = () => {
        setPhase("quiz");
        setQuizIndex(0);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setPendingAnswer(null);
        setQuizAnswers([]);
        setEarnedXP(0);
        setHideBottomMenu(true);
    };

    const handleSelectOption = (index: number) => {
        if (selectedAnswer !== null) return;
        setPendingAnswer(index);
    };

    const handleConfirmAnswer = () => {
        if (pendingAnswer === null || selectedAnswer !== null || !selectedNews?.questions) return;
        const correct = selectedNews.questions[quizIndex].correct;
        setSelectedAnswer(pendingAnswer);
        const correctFlag = pendingAnswer === correct;
        setIsCorrect(correctFlag);

        // Track the answer locally — XP will be awarded on quiz completion
        setQuizAnswers((prev) => [
            ...prev,
            {
                questionId: selectedNews.questions![quizIndex].id,
                selectedOptionIndex: pendingAnswer,
                isCorrect: correctFlag,
            },
        ]);
    };

    const handleExitQuiz = () => {
        setShowExitConfirm(false);
        setPhase("hub");
        setSelectedNews(null);
        setQuizIndex(0);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setPendingAnswer(null);
        setQuizAnswers([]);
        setEarnedXP(0);
        setHideBottomMenu(false);
    };

    const handleNextQuiz = () => {
        if (!selectedNews?.questions) return;
        if (quizIndex < selectedNews.questions.length - 1) {
            setQuizIndex(quizIndex + 1);
            setSelectedAnswer(null);
            setIsCorrect(null);
            setPendingAnswer(null);
        } else {
            // Quiz complete — submit all answers to backend
            submitQuizResults();
        }
    };

    const submitQuizResults = async () => {
        if (!selectedNews) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/news/answers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    selectionId: selectedNews.id,
                    answers: quizAnswers.map((a) => ({
                        questionId: a.questionId,
                        selectedOptionIndex: a.selectedOptionIndex,
                    })),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setEarnedXP(data.totalXpEarned);
                // Refresh store XP from server to stay in sync
                await fetchUser();
            }
        } catch (err) {
            console.error("Failed to submit quiz answers:", err);
        } finally {
            setSubmitting(false);
            setCompletedIds((prev) => new Set([...prev, selectedNews!.id]));
            setPhase("completed");
        }
    };

    if (showOnboarding) {
        return (
            <div className="min-h-screen relative flex items-center justify-center p-6 bg-[#0a0f1a]">
                <ProfileSetupModal
                    open={showOnboarding}
                    onComplete={(s) => {
                        setShowOnboarding(false);
                        fetchNews(s);
                    }}
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#110a24] relative flex flex-col items-center justify-center p-6 gap-6">
                <BackgroundGraphics />
                <CircleDashed className="w-16 h-16 text-[#05d9e8] opacity-80" />
                <p className="text-[#05d9e8] font-black text-xl tracking-widest uppercase">
                    Initializing Intelligence...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#ea2b2b] relative flex flex-col items-center justify-center p-6 gap-6 text-center">
                <BackgroundGraphics />
                <RefreshCw className="w-16 h-16 text-white mb-4" />
                <h1 className="text-4xl font-black text-white uppercase">
                    Link Failure
                </h1>
                <p className="text-white/80 font-bold">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-10 py-4 bg-white text-[#ea2b2b] font-black rounded-2xl shadow-[0_6px_0_#cccccc] uppercase"
                >
                    Reconnect
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full relative text-white font-['Inter',sans-serif] flex flex-col pt-24 pb-32 bg-[#110a24]">
            <BackgroundGraphics />

            {phase !== "quiz" && phase !== "completed" && (() => {
                const remainingXP = news.reduce((acc, item) => {
                    return acc + (completedIds.has(item.id) ? 0 : item.reward);
                }, 0);
                const isFullyAcquired = remainingXP === 0 && news.length > 0;

                return (
                    <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-4 pb-2 flex items-center justify-between pointer-events-none text-white">
                        <div className="flex items-center gap-2 pointer-events-auto">
                            {/* Level & XP Link to Lab */}
                            <Link
                                href="/lab"
                                className="flex flex-col gap-1.5 bg-[#18102e]/60 backdrop-blur-md border-[3px] border-[#0c0817] px-4 py-2 rounded-[20px] shadow-lg min-w-[120px] font-sans"
                            >
                                <div className="flex items-center justify-center">
                                    <span className="font-black text-white/90 text-[11px] tracking-widest whitespace-nowrap uppercase">
                                        Level {level}
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-[#05d9e8] rounded-full shadow-[0_0_8px_#05d9e8]"
                                        style={{ width: `${levelProgress || 0}%` }}
                                    />
                                </div>
                            </Link>
                        </div>

                        {/* Status Badge */}
                        <div className="pointer-events-auto bg-[#18102e] border-[3px] border-[#0c0817] px-4 py-2 rounded-[20px] shadow-lg flex items-center gap-2 min-w-[140px] justify-center">
                            <div
                                className={cn(
                                    "w-3 h-3 rounded-full",
                                    isFullyAcquired
                                        ? "bg-[#05d9e8] shadow-[0_0_8px_#05d9e8]"
                                        : "bg-[#FF1E56] shadow-[0_0_8px_#FF1E56]",
                                )}
                            />
                            <span className="text-[11px] font-black tracking-widest uppercase text-white/80">
                                {isFullyAcquired ? "SECURED" : `${remainingXP} XP LEFT`}
                            </span>
                        </div>
                    </div>
                );
            })()}

            <div className="max-w-xl mx-auto w-full px-6 flex-grow relative z-10 flex flex-col">
                {phase === "hub" && (
                    <div className="space-y-8">
                        <div className="mb-10">
                            <h1 className="text-4xl font-black text-white tracking-widest drop-shadow-lg">
                                Daily Intel
                            </h1>
                            <p className="text-white/80 font-bold text-lg">
                                Acquire new knowledge from the sector.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {sortedNews.map(({ item, originalIndex }) => {
                                const isDone = completedIds.has(item.id);
                                const styles = TIER_STYLES[item.tier] || TIER_STYLES[3];
                                const isTopReward = top3Ids.includes(item.id);

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectNews(item)}
                                        className={cn(
                                            "w-full text-left p-5 rounded-[32px] border-b-[8px] flex items-center gap-5 relative overflow-visible",
                                            isDone
                                                ? "bg-[#181129] border-[#0f0b1a] text-[#4d3d75]"
                                                : `${styles.card} ${styles.border}`,
                                        )}
                                    >
                                        {/* Top Reward Fire Icon */}
                                        {!isDone && isTopReward && (
                                            <div className="absolute -top-3 -left-3 z-20 bg-[#FF1E56] text-white p-2 rounded-full shadow-lg border-2 border-white scale-110">
                                                <Flame className="w-5 h-5 fill-current" />
                                            </div>
                                        )}

                                        <div
                                            className={cn(
                                                "w-16 h-16 rounded-[24px] flex items-center justify-center flex-shrink-0 border-b-4 text-2xl font-black",
                                                isDone
                                                    ? "bg-[#1f1635] text-[#4d3d75] border-[#181129]"
                                                    : `${styles.iconBg} text-white border-black/10`,
                                            )}
                                        >
                                            {originalIndex + 1}
                                        </div>
                                        <div className="flex-grow">
                                            <h3
                                                className={cn(
                                                    "text-xl font-black mb-1 line-clamp-2 tracking-tight",
                                                    isDone ? "text-[#4d3d75]" : styles.title,
                                                )}
                                            >
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={cn(
                                                        "font-bold text-xs uppercase flex items-center gap-1",
                                                        isDone ? "text-[#4d3d75]/60" : styles.xp,
                                                    )}
                                                >
                                                    <Zap className="w-4 h-4 fill-current" /> +
                                                    {item.reward} XP
                                                </span>
                                                <span
                                                    className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        isDone ? "text-[#4d3d75]/40" : styles.sector,
                                                    )}
                                                >
                                                    Sector {item.tier}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Right arrow removed as per request */}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {phase === "read" && selectedNews && (
                    <div className="flex flex-col h-full">
                        <button
                            onClick={() => setPhase("hub")}
                            className="mb-8 flex items-center gap-2 text-white/60 font-black uppercase tracking-widest text-xs hover:text-white"
                        >
                            <ChevronLeft className="w-5 h-5" /> Back to List
                        </button>

                        <div className="flex-grow space-y-10">
                            <h1 className="text-3xl font-black leading-tight text-white tracking-tight drop-shadow-md">
                                {selectedNews.title}
                            </h1>

                            <div className="bg-[#1b1236] border-[3px] border-[#0A0A26] p-8 pt-10 rounded-[32px] shadow-2xl relative">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF7E5F] px-4 py-1 rounded-full border-[2px] border-[#0A0A26] text-white font-black text-xs uppercase tracking-widest z-20">
                                    SUMMARY
                                </div>
                                <div className="absolute top-0 right-0 w-48 h-48 bg-[#ff2262]/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                                <p className="text-xl text-[#d4c5f9] leading-relaxed font-semibold relative z-10">
                                    {selectedNews.summary}
                                </p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4 mb-4">
                                    <div className="flex-1 bg-[#15113B] rounded-2xl p-4 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white">{selectedNews.reward}</span>
                                        <span className="text-[10px] font-black text-[#A5A5D9] uppercase tracking-widest">EXP REWARD</span>
                                    </div>
                                    <div className="flex-1 bg-[#15113B] rounded-2xl p-4 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white">{selectedNews.questions?.length || 0}</span>
                                        <span className="text-[10px] font-black text-[#A5A5D9] uppercase tracking-widest">NEURAL PROBES</span>
                                    </div>
                                </div>

                                <a
                                    href={selectedNews.url}
                                    target="_blank"
                                    onClick={() => setArticleOpened(true)}
                                    className={cn(
                                        "w-full py-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                                        articleOpened
                                            ? "bg-[#18102e] border-[4px] border-[#100a1c] text-[#7a64ad]"
                                            : "bg-white border-[4px] border-[#0A0A26] text-[#0A0A26] hover:brightness-95"
                                    )}
                                >
                                    <ExternalLink className="w-5 h-5" /> Full Article
                                </a>
                                {articleOpened && (
                                    <button
                                        onClick={handleStartQuiz}
                                        className="w-full py-5 bg-[#58CC02] text-white rounded-[32px] font-black text-2xl border-b-[8px] border-[#45a302] flex items-center justify-center gap-4 uppercase tracking-tighter shadow-lg"
                                    >
                                        Start <ArrowRight className="w-8 h-8" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {phase === "quiz" && selectedNews && selectedNews.questions && (
                    <div className="flex flex-col h-full">
                        {/* Close button matching LevelModal */}
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setShowExitConfirm(true)}
                                className="w-12 h-12 bg-[#2a1f45] border-[4px] border-[#0A0A26] shadow-[0_6px_0_#0A0A26] rounded-2xl text-white font-black text-2xl flex items-center justify-center hover:bg-[#3d2f63] active:translate-y-1 active:shadow-[0_2px_0_#0A0A26] transition-all"
                            >
                                ×
                            </button>
                        </div>

                        <QuizProgressBar current={quizIndex} total={selectedNews.questions?.length || 1} />

                        <div className="mb-10 bg-[#15113B] p-8 rounded-[32px] border-[3px] border-[#0A0A26] shadow-[inset_0_4px_0_rgba(255,255,255,0.05)]">
                            <h3 className="text-2xl font-black text-white leading-[1.3] flex gap-5">
                                <span className="text-[#FF7E5F] shrink-0 text-3xl">?</span>
                                {selectedNews.questions[quizIndex].question}
                            </h3>
                        </div>

                        <QuizOptionList
                            options={selectedNews.questions[quizIndex].options}
                            correctIndex={selectedNews.questions[quizIndex].correct}
                            selectedIndex={selectedAnswer}
                            pendingIndex={pendingAnswer}
                            answered={selectedAnswer !== null}
                            onSelect={handleSelectOption}
                        />

                        <QuizConfirmButton
                            visible={pendingAnswer !== null && selectedAnswer === null}
                            onConfirm={handleConfirmAnswer}
                        />

                        <QuizResultBanner
                            visible={selectedAnswer !== null}
                            isCorrect={isCorrect === true}
                            explanation={selectedNews.questions[quizIndex].explanation}
                            isLastQuestion={quizIndex >= selectedNews.questions.length - 1}
                            onNext={handleNextQuiz}
                        />

                        <QuizExitConfirm
                            visible={showExitConfirm}
                            message="Your current progress will be lost and you'll need to start this quiz over from the beginning."
                            onConfirm={handleExitQuiz}
                            onCancel={() => setShowExitConfirm(false)}
                        />
                    </div>
                )}

                {phase === "completed" && selectedNews && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center flex flex-col items-center justify-center flex-1 py-12"
                    >
                        <div className="relative mb-12">
                            <div className="w-40 h-40 bg-[#4EEAFF] rounded-full flex items-center justify-center border-[5px] border-[#0A0A26] shadow-[0_15px_0_#0A0A26] animate-[bounce_2s_infinite]">
                                <FomoBird className="w-28 h-28" expression="happy" />
                            </div>
                            <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#FEB47B] rounded-full border-[4px] border-[#0A0A26] flex items-center justify-center font-black text-3xl text-white shadow-lg">
                                ★
                            </div>
                        </div>

                        <h2 className="text-6xl font-black text-white mb-6 uppercase tracking-tighter leading-tight italic drop-shadow-[0_8px_0_#0A0A26]">
                            DECODED
                        </h2>

                        <div className="bg-[#15113B] border-[5px] border-[#0A0A26] rounded-[48px] p-10 w-full max-w-sm mb-12 shadow-[0_18px_0_#0A0A26] relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                            <p className="text-[#A5A5D9] font-black uppercase tracking-[0.4em] text-xs mb-6 relative z-10">Neural Intelligence Gain</p>
                            <div className="flex items-center justify-center gap-4 mb-4 relative z-10">
                                <span className="text-4xl text-[#FEB47B] font-black">+</span>
                                <p className="text-7xl font-black text-[#FEB47B] leading-none drop-shadow-[0_8px_0_#000]">
                                    {earnedXP}
                                </p>
                            </div>
                            <p className="text-white font-black text-xl relative z-10 uppercase tracking-widest bg-black/30 py-2 rounded-2xl border-[2px] border-white/5">
                                MISSION SUCCESS
                            </p>

                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF7E5F] opacity-10 rounded-full translate-x-16 -translate-y-16" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#4EEAFF] opacity-10 rounded-full -translate-x-12 translate-y-12" />
                        </div>

                        <button
                            onClick={() => { setPhase("hub"); setHideBottomMenu(false); }}
                            className="w-full max-w-sm bg-[#FF7E5F] text-white border-[4px] border-[#0A0A26] shadow-[0_10px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] rounded-3xl px-8 py-6 text-2xl font-black uppercase tracking-widest active:translate-y-1 active:shadow-[0_4px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] transition-all hover:brightness-110"
                        >
                            EXCELLENT
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
