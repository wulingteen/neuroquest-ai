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
    ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { type NewsItem } from "@/types/game";
import ProfileSetupModal from "@/components/ProfileSetupModal";

/**
 * CONSISTENT NASA BLUE / DUOLINGO STYLE NEWS PAGE
 * Replicates the home page's background graphics and top bar.
 */

const BackgroundGraphics = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <svg width="100%" height="100%" className="absolute inset-0">
                <circle cx="15%" cy="15%" r="6" fill="white" opacity="0.3" />
                <circle cx="85%" cy="25%" r="4" fill="white" opacity="0.2" />
                <circle cx="20%" cy="75%" r="8" fill="white" opacity="0.15" />
                <circle cx="80%" cy="85%" r="5" fill="white" opacity="0.4" />
                <circle cx="50%" cy="50%" r="3" fill="white" opacity="0.5" />
                <circle cx="10%" cy="90%" r="4" fill="white" opacity="0.6" />
                <circle cx="90%" cy="10%" r="150" fill="white" opacity="0.05" />
                <path d="M-50,200 Q150,50 350,250 T700,150" fill="none" stroke="white" strokeWidth="30" opacity="0.05" />
            </svg>
        </div>
    );
};

type Phase = 'hub' | 'read' | 'quiz' | 'completed';

export default function NewsPage() {
    const router = useRouter();
    const { xp, level, levelProgress, addXP, streak } = useGameStore();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

    // Flow State
    const [phase, setPhase] = useState<Phase>('hub');
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
            const tier = score <= 20 ? 1 : score <= 40 ? 2 : score <= 60 ? 3 : score <= 80 ? 4 : 5;
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
        setPhase('read');
    };

    const handleStartQuiz = () => {
        setPhase('quiz');
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
            setCompletedIds(prev => new Set([...prev, selectedNews.id]));
            setPhase('completed');
        }
    };

    if (showOnboarding) {
        return (
            <div className="min-h-screen relative flex items-center justify-center p-6 bg-[#0a0f1a]">
                <ProfileSetupModal open={showOnboarding} onComplete={(s) => {
                    setShowOnboarding(false);
                    fetchNews(s);
                }} />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#1cb0f6] relative flex flex-col items-center justify-center p-6 gap-6">
                <BackgroundGraphics />
                <CircleDashed className="w-16 h-16 text-white animate-spin opacity-50" />
                <p className="text-white font-black text-xl tracking-widest uppercase">Initializing Intelligence...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#ea2b2b] relative flex flex-col items-center justify-center p-6 gap-6 text-center">
                <BackgroundGraphics />
                <RefreshCw className="w-16 h-16 text-white mb-4" />
                <h1 className="text-4xl font-black text-white uppercase">Link Failure</h1>
                <p className="text-white/80 font-bold">{error}</p>
                <button onClick={() => window.location.reload()} className="px-10 py-4 bg-white text-[#ea2b2b] font-black rounded-2xl shadow-[0_6px_0_#cccccc] active:translate-y-1 active:shadow-none transition-all uppercase">
                    Reconnect
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full relative text-white font-['Inter',sans-serif] flex flex-col pt-24 pb-32 transition-colors duration-700 ease-in-out" style={{ backgroundColor: "#1cb0f6" }}>
            <BackgroundGraphics />

            {/* Top Bar - Consistent Simplified Style */}
            <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-4 pb-2 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Level & XP Link to Lab */}
                    <Link
                        href="/lab"
                        className="flex flex-col gap-1.5 bg-[#ffc800] border-b-4 border-[#e5a900] px-4 py-2 rounded-2xl shadow-lg min-w-[120px] active:translate-y-1 active:border-b-0 transition-all font-sans"
                    >
                        <div className="flex items-center justify-center">
                            <span className="font-black text-white text-[11px] tracking-widest whitespace-nowrap uppercase">Level {level}</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${levelProgress || 0}%` }}
                            />
                        </div>
                    </Link>
                </div>

                {/* Status Badge */}
                <div className="pointer-events-auto bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#58cc02] rounded-full animate-pulse" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-[#cccccc]">Intel Hub</span>
                </div>
            </div>

            <div className="max-w-xl mx-auto w-full px-6 flex-grow relative z-10 flex flex-col">
                <AnimatePresence mode="wait">
                    {phase === 'hub' && (
                        <motion.div
                            key="hub"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-8"
                        >
                            <div className="mb-10">
                                <h1 className="text-4xl font-black text-white uppercase tracking-widest drop-shadow-lg">Daily Intel</h1>
                                <p className="text-white/80 font-bold text-lg">Acquire new knowledge from the sector.</p>
                            </div>

                            <div className="space-y-4">
                                {news.map((item, idx) => {
                                    const isDone = completedIds.has(item.id);
                                    let btnBg = isDone ? "bg-white/10 border-white/5 opacity-60" : "bg-white/20 border-white/10 hover:bg-white/30";
                                    let shadowColor = isDone ? "transparent" : "rgba(0,0,0,0.2)";

                                    return (
                                        <motion.button
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={item.id}
                                            onClick={() => handleSelectNews(item)}
                                            className={cn(
                                                "w-full text-left p-6 rounded-[32px] border-b-8 transition-all flex items-center gap-6 relative overflow-hidden",
                                                isDone
                                                    ? "bg-black/20 border-black/40 text-white/40"
                                                    : "bg-white/15 border-white/10 hover:bg-white/20 active:translate-y-1 active:border-b-4",
                                            )}
                                            style={{ borderColor: isDone ? undefined : 'rgba(255,255,255,0.1)' }}
                                        >
                                            <div className={cn(
                                                "w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl shadow-inner",
                                                isDone ? "bg-white/5" : "bg-[#1cb0f6] text-white"
                                            )}>
                                                {isDone ? <CheckCircle2 className="w-8 h-8" /> : <Flame className="w-8 h-8 fill-current" />}
                                            </div>
                                            <div className="flex-grow">
                                                <h3 className="text-xl font-black mb-1 line-clamp-1 uppercase tracking-tight">{item.title}</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-amber-400 font-bold text-xs uppercase flex items-center gap-1">
                                                        <Zap className="w-4 h-4 fill-amber-400" /> +{item.reward} XP
                                                    </span>
                                                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Sector {item.tier}</span>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-6 h-6 text-white/30" />
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {phase === 'read' && selectedNews && (
                        <motion.div
                            key="read"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <button onClick={() => setPhase('hub')} className="mb-8 flex items-center gap-2 text-white/60 font-black uppercase tracking-widest text-xs hover:text-white transition-colors">
                                <ChevronLeft className="w-5 h-5" /> Back to List
                            </button>

                            <div className="flex-grow space-y-10">
                                <h1 className="text-3xl font-black leading-tight text-white uppercase tracking-tight drop-shadow-md">{selectedNews.title}</h1>

                                <div className="bg-black/30 backdrop-blur-xl border-2 border-white/10 p-8 rounded-[48px] shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                                    <p className="text-xl text-white/90 leading-relaxed font-medium relative z-10">
                                        {selectedNews.summary}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <a
                                        href={selectedNews.url}
                                        target="_blank"
                                        className="w-full py-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 text-white/60 hover:bg-white/10 transition-all"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Full Transmission
                                    </a>
                                    <button
                                        onClick={handleStartQuiz}
                                        className="w-full py-6 bg-[#1cb0f6] text-white rounded-3xl font-black text-2xl border-b-8 border-[#1498d5] active:translate-y-1 active:border-b-4 transition-all flex items-center justify-center gap-4 uppercase tracking-tighter"
                                    >
                                        VERIFY INTEL <ArrowRight className="w-8 h-8" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {phase === 'quiz' && selectedNews && selectedNews.questions && (
                        <motion.div
                            key={`quiz-${quizIndex}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <div className="w-full h-3 bg-black/30 backdrop-blur-sm rounded-full mb-12 overflow-hidden border border-white/10">
                                <motion.div
                                    className="h-full bg-[#58cc02]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((quizIndex + 1) / selectedNews.questions.length) * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>

                            <h2 className="text-2xl font-black mb-10 text-center text-white uppercase tracking-tight leading-snug">
                                {selectedNews.questions[quizIndex].question}
                            </h2>

                            <div className="space-y-4 flex-grow">
                                {selectedNews.questions[quizIndex].options.map((opt, i) => {
                                    const isSelected = selectedAnswer === i;
                                    const correctIdx = selectedNews.questions![quizIndex].correct;
                                    const showResult = selectedAnswer !== null;

                                    let style = "bg-white/10 border-white/10 text-white hover:bg-white/20";
                                    if (showResult) {
                                        if (i === correctIdx) style = "bg-[#58cc02] border-[#46a302] text-white shadow-[0_4px_0_#3d8c11]";
                                        else if (isSelected) style = "bg-[#ea2b2b] border-[#ba2222] text-white shadow-[0_4px_0_#961b1b]";
                                        else style = "bg-black/20 border-white/5 text-white/20 opacity-40";
                                    } else if (isSelected) {
                                        style = "bg-[#1cb0f6] border-[#1498d5] text-white shadow-[0_4px_0_#107db0]";
                                    }

                                    return (
                                        <button
                                            key={i}
                                            disabled={showResult}
                                            onClick={() => handleAnswer(i)}
                                            className={cn(
                                                "w-full p-6 rounded-[28px] border-b-6 font-black text-lg text-left transition-all uppercase tracking-tight",
                                                style,
                                                !showResult && isSelected && "translate-y-1 border-b-2"
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
                                        "fixed bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 z-50 backdrop-blur-2xl border-t-4",
                                        isCorrect
                                            ? "bg-[#d7ffb8]/95 border-[#58cc02] text-[#1e4601]"
                                            : "bg-[#ffd7d7]/95 border-[#ea2b2b] text-[#5e1212]"
                                    )}
                                >
                                    <div className="max-w-xl w-full flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl shadow-lg",
                                                isCorrect ? "bg-[#58cc02]" : "bg-[#ea2b2b]"
                                            )}>
                                                {isCorrect ? "✓" : "×"}
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-black uppercase tracking-tighter">{isCorrect ? "Verified" : "Data Mismatch"}</h3>
                                                <p className="text-sm font-bold opacity-80 line-clamp-2">{selectedNews.questions[quizIndex].explanation}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleNextQuiz}
                                            className={cn(
                                                "px-10 py-5 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest transition-all whitespace-nowrap border-b-8 active:translate-y-1 active:border-b-2",
                                                isCorrect ? "bg-[#58cc02] border-[#46a302]" : "bg-[#ea2b2b] border-[#ba2222]"
                                            )}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {phase === 'completed' && selectedNews && (
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
                                <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Mission Success</h1>
                                <p className="text-white/80 font-black text-xl uppercase tracking-[0.2em]">Intel Assimilated</p>
                            </div>

                            <div className="bg-black/30 backdrop-blur-xl p-8 rounded-[48px] border-2 border-white/10 flex items-center justify-around shadow-2xl">
                                <div className="text-center">
                                    <p className="text-white/40 font-black uppercase text-[10px] tracking-widest mb-2">XP GAIN</p>
                                    <div className="text-4xl font-black text-amber-400 flex items-center gap-2">
                                        <Zap className="w-8 h-8 fill-amber-400" /> +{selectedNews.reward}
                                    </div>
                                </div>
                                <div className="w-px h-16 bg-white/10" />
                                <div className="text-center">
                                    <p className="text-white/40 font-black uppercase text-[10px] tracking-widest mb-2">CAPACITY</p>
                                    <div className="text-4xl font-black text-white">+{Math.ceil(selectedNews.reward / 10)}%</div>
                                </div>
                            </div>

                            <button
                                onClick={() => setPhase('hub')}
                                className="w-full py-7 bg-white text-[#3b82f6] rounded-[32px] font-black text-3xl shadow-[0_12px_0_#dddddd] active:translate-y-2 active:shadow-none transition-all uppercase tracking-tighter"
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
