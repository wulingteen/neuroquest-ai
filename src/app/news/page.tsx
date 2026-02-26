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
    Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type NewsItem } from "@/types/game";
import ProfileSetupModal from "@/components/ProfileSetupModal";

/**
 * DUOLINGO STYLE NEWS PAGE
 * Clean, approachable, focused.
 */

const Background = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#0a0f1a]">
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(90deg,white_1px,transparent_1px),linear-gradient(180deg,white_1px,transparent_1px)] [background-size:100px_100px]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#1cb0f6]/10 to-transparent" />
    </div>
);

type Phase = 'hub' | 'read' | 'quiz' | 'completed';

export default function NewsPage() {
    const { addXP } = useGameStore();
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
            <div className="min-h-screen relative flex flex-col items-center justify-center p-6 gap-6 bg-[#0a0f1a]">
                <CircleDashed className="w-16 h-16 text-[#1cb0f6] animate-spin" />
                <p className="text-[#1cb0f6] font-bold text-xl">Loading your stories...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen relative flex flex-col items-center justify-center p-6 gap-6 bg-[#0a0f1a] text-center">
                <RefreshCw className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-3xl font-bold text-white">Oops!</h1>
                <p className="text-gray-400">{error}</p>
                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-[#1cb0f6] text-white font-bold rounded-2xl shadow-[0_5px_0_#1498d5] active:translate-y-1 active:shadow-none transition-all">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative text-white font-['Inter'] flex flex-col pt-20 pb-20">
            <Background />

            <div className="max-w-xl mx-auto w-full px-6 flex-grow relative z-10 flex flex-col">
                <AnimatePresence mode="wait">
                    {phase === 'hub' && (
                        <motion.div
                            key="hub"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2 mb-12">
                                <h1 className="text-4xl font-black text-white">Daily News</h1>
                                <p className="text-gray-400 font-bold">Pick a story to start learning!</p>
                            </div>

                            <div className="space-y-6">
                                {news.map((item, idx) => {
                                    const isDone = completedIds.has(item.id);
                                    return (
                                        <motion.button
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            key={item.id}
                                            onClick={() => handleSelectNews(item)}
                                            className={cn(
                                                "w-full text-left p-6 rounded-3xl border-2 transition-all flex items-center gap-6",
                                                isDone
                                                    ? "bg-[#111827]/40 border-white/5 opacity-60"
                                                    : "bg-[#111827] border-white/10 hover:border-[#1cb0f6] hover:bg-[#111827]/80 shadow-[0_4px_0_rgba(255,255,255,0.05)]"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl",
                                                isDone ? "bg-gray-800" : "bg-[#1cb0f6]/20 text-[#1cb0f6]"
                                            )}>
                                                {isDone ? "✅" : "🔥"}
                                            </div>
                                            <div className="flex-grow">
                                                <h3 className="text-xl font-black mb-1 line-clamp-1">{item.title}</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-amber-500 font-bold text-sm uppercase flex items-center gap-1">
                                                        <Zap className="w-4 h-4 fill-amber-500" /> +{item.reward} XP
                                                    </span>
                                                    <span className="text-gray-500 text-xs font-bold uppercase">Level {item.tier}</span>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-6 h-6 text-gray-600" />
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
                            <button onClick={() => setPhase('hub')} className="mb-8 flex items-center gap-2 text-gray-400 font-bold hover:text-white transition-colors">
                                <ChevronLeft className="w-6 h-6" /> Back to List
                            </button>

                            <div className="flex-grow space-y-8">
                                <h1 className="text-3xl font-black leading-tight text-white">{selectedNews.title}</h1>

                                <div className="bg-[#111827] border-2 border-white/10 p-8 rounded-[40px] shadow-xl">
                                    <p className="text-xl text-gray-300 leading-relaxed font-medium">
                                        {selectedNews.summary}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <a
                                        href={selectedNews.url}
                                        target="_blank"
                                        className="w-full py-4 bg-white/5 border-2 border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 text-gray-400 hover:bg-white/10 transition-all"
                                    >
                                        <ExternalLink className="w-5 h-5" /> Read Full Story
                                    </a>
                                    <button
                                        onClick={handleStartQuiz}
                                        className="w-full py-6 bg-[#1cb0f6] text-white rounded-2xl font-black text-2xl shadow-[0_8px_0_#1498d5] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3"
                                    >
                                        I'M READY <ArrowRight className="w-8 h-8" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {phase === 'quiz' && selectedNews && selectedNews.questions && (
                        <motion.div
                            key={`quiz-${quizIndex}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <div className="w-full h-4 bg-gray-800 rounded-full mb-12 overflow-hidden">
                                <motion.div
                                    className="h-full bg-[#58cc02]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((quizIndex + 1) / selectedNews.questions.length) * 100}%` }}
                                />
                            </div>

                            <h2 className="text-2xl font-black mb-8 text-center text-white">
                                {selectedNews.questions[quizIndex].question}
                            </h2>

                            <div className="space-y-4 flex-grow">
                                {selectedNews.questions[quizIndex].options.map((opt, i) => {
                                    const isSelected = selectedAnswer === i;
                                    const correctIdx = selectedNews.questions![quizIndex].correct;
                                    const showResult = selectedAnswer !== null;

                                    let style = "bg-[#111827] border-white/10 text-white hover:bg-[#111827]/80";
                                    if (showResult) {
                                        if (i === correctIdx) style = "bg-[#58cc02]/20 border-[#58cc02] text-[#58cc02]";
                                        else if (isSelected) style = "bg-red-500/20 border-red-500 text-red-500";
                                        else style = "bg-[#111827] border-white/5 text-gray-600 opacity-50";
                                    } else if (isSelected) {
                                        style = "bg-[#1cb0f6]/20 border-[#1cb0f6] text-[#1cb0f6]";
                                    }

                                    return (
                                        <button
                                            key={i}
                                            disabled={showResult}
                                            onClick={() => handleAnswer(i)}
                                            className={cn(
                                                "w-full p-6 rounded-3xl border-2 font-bold text-lg text-left transition-all shadow-[0_4px_0_rgba(255,255,255,0.05)]",
                                                style
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedAnswer !== null && (
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "fixed bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 z-50",
                                        isCorrect ? "bg-[#d7ffb8] text-[#58cc02]" : "bg-[#ffd7d7] text-[#ea2b2b]"
                                    )}
                                >
                                    <div className="max-w-xl w-full flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-full flex items-center justify-center text-white",
                                                isCorrect ? "bg-[#58cc02]" : "bg-[#ea2b2b]"
                                            )}>
                                                {isCorrect ? "✓" : "×"}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black uppercase">{isCorrect ? "Excellent!" : "Not quite"}</h3>
                                                <p className="text-sm font-bold opacity-80">{selectedNews.questions[quizIndex].explanation}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleNextQuiz}
                                            className={cn(
                                                "px-10 py-4 text-white font-black rounded-2xl shadow-lg uppercase transition-all whitespace-nowrap",
                                                isCorrect ? "bg-[#58cc02] shadow-[0_5px_0_#46a302]" : "bg-[#ea2b2b] shadow-[0_5px_0_#ba2222]"
                                            )}
                                        >
                                            Continue
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
                                <div className="w-32 h-32 bg-[#ffc800] rounded-full flex items-center justify-center mx-auto shadow-[0_10px_0_#e5a900] text-6xl">
                                    🏆
                                </div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full"
                                />
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-5xl font-black text-white">Story Complete!</h1>
                                <p className="text-[#1cb0f6] font-bold text-xl uppercase tracking-widest">You learned something new!</p>
                            </div>

                            <div className="bg-[#111827] p-8 rounded-[40px] border-2 border-white/10 flex items-center justify-around">
                                <div className="text-center">
                                    <p className="text-gray-500 font-bold uppercase text-xs mb-1">XP EARNED</p>
                                    <div className="text-4xl font-black text-amber-500 flex items-center gap-2">
                                        <Zap className="w-8 h-8 fill-amber-500" /> +{selectedNews.reward}
                                    </div>
                                </div>
                                <div className="w-px h-12 bg-white/10" />
                                <div className="text-center">
                                    <p className="text-gray-500 font-bold uppercase text-xs mb-1">LEVEL UP</p>
                                    <div className="text-4xl font-black text-white">+{Math.ceil(selectedNews.reward / 10)}%</div>
                                </div>
                            </div>

                            <button
                                onClick={() => setPhase('hub')}
                                className="w-full py-6 bg-white text-black rounded-3xl font-black text-2xl shadow-[0_8px_0_#cccccc] active:translate-y-2 active:shadow-none transition-all uppercase tracking-tighter"
                            >
                                Great Job!
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
