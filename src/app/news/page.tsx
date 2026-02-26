"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import {
    Flame,
    Zap,
    ChevronLeft,
    CheckCircle2,
    ArrowRight,
    CircleDashed,
    RefreshCw,
    ExternalLink,
    BookOpen,
    Trophy,
    Building,
    ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { type NewsItem } from "@/types/game";
import ProfileSetupModal from "@/components/ProfileSetupModal";

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

const BackgroundGraphics = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Solid color cosmic background wrapper is handled by the main div, we just add the SVG overlay */}
            <svg width="100%" height="100%" className="absolute inset-0">
                {/* Kurzgesagt Planets - Solid bright colors, crisp borders */}
                {/* Red Planet */}
                <circle cx="10%" cy="20%" r="80" fill="#FF1E56" />
                <circle cx="13%" cy="17%" r="35" fill="#FF4E78" />
                <circle cx="5%" cy="25%" r="15" fill="#D90036" />

                {/* Blue Planet */}
                <circle cx="90%" cy="25%" r="140" fill="#00D4FF" />
                <circle cx="93%" cy="20%" r="40" fill="#5CE1E6" />
                <circle cx="85%" cy="30%" r="20" fill="#00B0D9" />
                <circle
                    cx="90%"
                    cy="25%"
                    r="170"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="4"
                    strokeDasharray="12 18"
                    opacity="0.4"
                />

                {/* Yellow Ringed Planet */}
                <circle cx="75%" cy="85%" r="100" fill="#FFB800" />
                <circle cx="78%" cy="82%" r="25" fill="#FFD166" />
                <ellipse
                    cx="75%"
                    cy="85%"
                    rx="160"
                    ry="40"
                    fill="none"
                    stroke="#FFD166"
                    strokeWidth="12"
                />

                {/* Kurzgesagt Starfield - crisp solid white dots */}
                <circle cx="15%" cy="15%" r="3" fill="#ffffff" />
                <circle cx="25%" cy="5%" r="1.5" fill="#ffffff" />
                <circle cx="45%" cy="20%" r="4" fill="#ffffff" />
                <circle cx="80%" cy="12%" r="2" fill="#ffffff" />
                <circle cx="95%" cy="50%" r="3.5" fill="#ffffff" />
                <circle cx="8%" cy="65%" r="2" fill="#ffffff" />
                <circle cx="30%" cy="85%" r="4" fill="#ffffff" />
                <circle cx="65%" cy="85%" r="2.5" fill="#ffffff" />
                <circle cx="85%" cy="65%" r="3" fill="#ffffff" />
                <circle cx="50%" cy="55%" r="1.5" fill="#ffffff" />
                <circle cx="40%" cy="40%" r="3" fill="#ffffff" />
                <circle cx="20%" cy="45%" r="2" fill="#ffffff" />
                <circle cx="60%" cy="30%" r="2.5" fill="#ffffff" />

                <path
                    d="M-50,200 Q150,50 350,250 T700,150"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeDasharray="10 20"
                    opacity="0.2"
                />
            </svg>
        </div>
    );
};

type Phase = "hub" | "read" | "quiz" | "completed";

export default function NewsPage() {
    const router = useRouter();
    const { xp, level, levelProgress, addXP, streak } = useGameStore();
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

    // Onboarding
    const [showOnboarding, setShowOnboarding] = useState(false);

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
            setNews(data.items || []);
        } catch {
            setError("Failed to fetch stories");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectNews = (item: NewsItem) => {
        setSelectedNews(item);
        setPhase("read");
    };

    const handleStartQuiz = () => {
        setPhase("quiz");
        setQuizIndex(0);
        setSelectedAnswer(null);
        setIsCorrect(null);
    };

    const handleAnswer = (index: number) => {
        if (selectedAnswer !== null || !selectedNews?.questions) return;
        const correct = selectedNews.questions[quizIndex].correct;
        setSelectedAnswer(index);
        const correctFlag = index === correct;
        setIsCorrect(correctFlag);

        if (correctFlag) {
            addXP(selectedNews.questions[quizIndex].xp);
        }
    };

    const handleNextQuiz = () => {
        if (!selectedNews?.questions) return;
        if (quizIndex < selectedNews.questions.length - 1) {
            setQuizIndex(quizIndex + 1);
            setSelectedAnswer(null);
            setIsCorrect(null);
        } else {
            setCompletedIds((prev) => new Set([...prev, selectedNews.id]));
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
                <CircleDashed className="w-16 h-16 text-[#05d9e8] animate-spin opacity-80" />
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
                    className="px-10 py-4 bg-white text-[#ea2b2b] font-black rounded-2xl shadow-[0_6px_0_#cccccc] active:translate-y-1 active:shadow-none transition-all uppercase"
                >
                    Reconnect
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full relative text-white font-['Inter',sans-serif] flex flex-col pt-24 pb-32 transition-colors duration-700 ease-in-out bg-[#110a24]">
            <BackgroundGraphics />

            {/* Top Bar - Consistent Simplified Style */}
            <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-4 pb-2 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Level & XP Link to Lab */}
                    <Link
                        href="/lab"
                        className="flex flex-col gap-1.5 bg-[#18102e]/60 backdrop-blur-md border-[3px] border-[#0c0817] px-4 py-2 rounded-[20px] shadow-lg min-w-[120px] hover:bg-[#18102e]/80 active:translate-y-1 transition-all font-sans"
                    >
                        <div className="flex items-center justify-center">
                            <span className="font-black text-white/90 text-[11px] tracking-widest whitespace-nowrap uppercase">
                                Level {level}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-[#05d9e8] rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_#05d9e8]"
                                style={{ width: `${levelProgress || 0}%` }}
                            />
                        </div>
                    </Link>
                </div>

                {/* Status Badge */}
                <div className="pointer-events-auto bg-[#18102e] border-[3px] border-[#0c0817] px-4 py-2 rounded-[20px] shadow-lg flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#05d9e8] rounded-full animate-pulse shadow-[0_0_8px_#05d9e8]" />
                    <span className="text-[11px] font-black tracking-widest uppercase text-white/80">
                        Intel Hub
                    </span>
                </div>
            </div>

            <div className="max-w-xl mx-auto w-full px-6 flex-grow relative z-10 flex flex-col">
                <AnimatePresence mode="wait">
                    {phase === "hub" && (
                        <motion.div
                            key="hub"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-8"
                        >
                            <div className="mb-10">
                                <h1 className="text-4xl font-black text-white tracking-widest drop-shadow-lg">
                                    Daily Intel
                                </h1>
                                <p className="text-white/80 font-bold text-lg">
                                    Acquire new knowledge from the sector.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {(() => {
                                    // Identify the top 3 items by reward XP
                                    const top3Ids = [...news]
                                        .sort((a, b) => b.reward - a.reward)
                                        .slice(0, 3)
                                        .map((n) => n.id);

                                    return news.map((item, idx) => {
                                        const isDone = completedIds.has(item.id);
                                        const styles = TIER_STYLES[item.tier] || TIER_STYLES[3];
                                        const isTopReward = top3Ids.includes(item.id);

                                        return (
                                            <motion.button
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                key={item.id}
                                                onClick={() => handleSelectNews(item)}
                                                className={cn(
                                                    "w-full text-left p-5 rounded-[32px] border-b-[8px] transition-all flex items-center gap-5 relative overflow-visible",
                                                    isDone
                                                        ? "bg-[#181129] border-[#0f0b1a] text-[#4d3d75]"
                                                        : `${styles.card} ${styles.border} hover:scale-[1.02] active:translate-y-2 active:border-b-0 active:mt-[8px]`,
                                                )}
                                            >
                                                {/* Top Reward Fire Icon */}
                                                {!isDone && isTopReward && (
                                                    <div className="absolute -top-3 -left-3 z-20 bg-[#FF1E56] text-white p-2 rounded-full shadow-lg border-2 border-white scale-110 animate-pulse">
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
                                                    {idx + 1}
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
                                            </motion.button>
                                        );
                                    });
                                })()}
                            </div>
                        </motion.div>
                    )}

                    {phase === "read" && selectedNews && (
                        <motion.div
                            key="read"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <button
                                onClick={() => setPhase("hub")}
                                className="mb-8 flex items-center gap-2 text-white/60 font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" /> Back to List
                            </button>

                            <div className="flex-grow space-y-10">
                                <h1 className="text-3xl font-black leading-tight text-white tracking-tight drop-shadow-md">
                                    {selectedNews.title}
                                </h1>

                                <div className="bg-[#1b1236] border-[6px] border-[#110a24] p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#ff2262]/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                                    <p className="text-xl text-[#d4c5f9] leading-relaxed font-semibold relative z-10">
                                        {selectedNews.summary}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <a
                                        href={selectedNews.url}
                                        target="_blank"
                                        className="w-full py-5 bg-[#18102e] border-[4px] border-[#100a1c] rounded-[24px] font-black uppercase tracking-widest text-[#7a64ad] flex items-center justify-center gap-2 hover:bg-[#1d1435] hover:text-[#05d9e8] transition-all"
                                    >
                                        <ExternalLink className="w-5 h-5" /> Full Transmission
                                    </a>
                                    <button
                                        onClick={handleStartQuiz}
                                        className="w-full py-6 bg-[#05d9e8] text-[#0a0710] rounded-[32px] font-black text-2xl border-b-[8px] border-[#03b8c4] active:translate-y-2 active:border-b-0 active:mt-[8px] transition-all flex items-center justify-center gap-4 uppercase tracking-tighter shadow-lg"
                                    >
                                        VERIFY INTEL <ArrowRight className="w-8 h-8" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {phase === "quiz" && selectedNews && selectedNews.questions && (
                        <motion.div
                            key={`quiz-${quizIndex}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <div className="w-full h-4 bg-[#18102e] rounded-full mb-12 overflow-hidden border-[3px] border-[#100a1c]">
                                <motion.div
                                    className="h-full bg-[#05d9e8]"
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${((quizIndex + 1) / selectedNews.questions.length) * 100}%`,
                                    }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>

                            <h2 className="text-2xl font-black mb-10 text-center text-white tracking-tight leading-snug">
                                {selectedNews.questions[quizIndex].question}
                            </h2>

                            <div className="space-y-4 flex-grow">
                                {selectedNews.questions[quizIndex].options.map((opt, i) => {
                                    const isSelected = selectedAnswer === i;
                                    const correctIdx = selectedNews.questions![quizIndex].correct;
                                    const showResult = selectedAnswer !== null;

                                    let style =
                                        "bg-[#251847] border-[#19102e] text-[#b8aae0] hover:bg-[#2d1d56]";
                                    if (showResult) {
                                        if (i === correctIdx)
                                            style =
                                                "bg-[#58cc02] border-[#46a302] text-white shadow-[0_4px_0_#3d8c11]";
                                        else if (isSelected)
                                            style =
                                                "bg-[#ff2262] border-[#cc184c] text-white shadow-[0_4px_0_#990d34]";
                                        else style = "bg-[#150e29] border-[#0f0a1c] text-[#4d3d75]";
                                    } else if (isSelected) {
                                        style =
                                            "bg-[#05d9e8] border-[#03b8c4] text-[#0a0710] shadow-[0_4px_0_#028e99]";
                                    }

                                    return (
                                        <button
                                            key={i}
                                            disabled={showResult}
                                            onClick={() => handleAnswer(i)}
                                            className={cn(
                                                "w-full p-6 rounded-[32px] border-b-[6px] font-black text-lg text-left transition-all uppercase tracking-tight",
                                                style,
                                                !showResult &&
                                                isSelected &&
                                                "translate-y-[4px] border-b-0 mt-[6px]",
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedAnswer !== null && (
                                <motion.div
                                    initial={{ opacity: 0, y: 100 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "fixed bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 z-[60] border-t-[8px]",
                                        isCorrect
                                            ? "bg-[#2bd960] border-[#1b913e] text-[#000000]"
                                            : "bg-[#ff2262] border-[#cc184c] text-[#ffffff]",
                                    )}
                                >
                                    <div className="max-w-xl w-full flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-5">
                                            <div
                                                className={cn(
                                                    "w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl shadow-lg border-b-4",
                                                    isCorrect
                                                        ? "bg-white text-[#2bd960] border-white/80"
                                                        : "bg-white text-[#ff2262] border-white/80",
                                                )}
                                            >
                                                {isCorrect ? "✓" : "×"}
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-black tracking-tighter">
                                                    {isCorrect ? "Verified" : "Data Mismatch"}
                                                </h3>
                                                <p className="text-sm font-bold opacity-80 line-clamp-2">
                                                    {selectedNews.questions[quizIndex].explanation}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleNextQuiz}
                                            className={cn(
                                                "px-10 py-5 font-black rounded-[24px] shadow-lg uppercase tracking-widest transition-all whitespace-nowrap border-b-[6px] active:translate-y-[6px] active:border-b-0",
                                                isCorrect
                                                    ? "bg-white text-[#1b913e] border-[#e6e6e6]"
                                                    : "bg-white text-[#cc184c] border-[#e6e6e6]",
                                            )}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {phase === "completed" && selectedNews && (
                        <motion.div
                            key="completed"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-12 py-12"
                        >
                            <div className="relative">
                                <div className="w-32 h-32 bg-[#ffc800] rounded-full flex items-center justify-center mx-auto shadow-[0_12px_0_#e5a900] text-6xl active:scale-95 transition-transform cursor-default">
                                    🏆
                                </div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5, duration: 1 }}
                                    className="absolute inset-0 bg-yellow-400/30 blur-[60px] rounded-full -z-10"
                                />
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-5xl font-black text-white tracking-tighter">
                                    Mission Success
                                </h1>
                                <p className="text-white/80 font-black text-xl uppercase tracking-[0.2em]">
                                    Intel Assimilated
                                </p>
                            </div>

                            <div className="bg-[#1b1236] p-8 rounded-[48px] border-[6px] border-[#100a1f] flex items-center justify-around shadow-2xl">
                                <div className="text-center">
                                    <p className="text-[#a492cd] font-black uppercase text-[12px] tracking-widest mb-2">
                                        XP GAIN
                                    </p>
                                    <div className="text-4xl font-black text-[#ffb800] flex items-center gap-2">
                                        <Zap className="w-8 h-8 fill-[#ffb800]" /> +
                                        {selectedNews.reward}
                                    </div>
                                </div>
                                <div className="w-2 h-16 bg-[#100a1f] rounded-full" />
                                <div className="text-center">
                                    <p className="text-[#a492cd] font-black uppercase text-[12px] tracking-widest mb-2">
                                        CAPACITY
                                    </p>
                                    <div className="text-4xl font-black text-[#05d9e8]">
                                        +{Math.ceil(selectedNews.reward / 10)}%
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setPhase("hub")}
                                className="w-full py-7 bg-[#05d9e8] text-[#0a0710] rounded-[32px] font-black text-3xl border-b-[8px] border-[#03b8c4] active:translate-y-2 active:border-b-0 active:mt-[8px] transition-all uppercase tracking-tighter"
                            >
                                Excellent
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
