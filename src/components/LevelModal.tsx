"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { type QuizQuestion } from "@/lib/gameData";
import { CheckCircle2, XCircle, Zap, ChevronRight, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

interface LevelModalProps {
    onClose: () => void;
    planetName: string;
    levelId: string | number;
    levelNumber: number;
    rollup: string;
}

export default function LevelModal({ onClose, planetName, levelId, levelNumber, rollup }: LevelModalProps) {
    const { addXP, completeLevel } = useGameStore();
    const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
    const [currentQ, setCurrentQ] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [totalXP, setTotalXP] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                // Ensure questions for each level_number and rollup are sourced from quiz_questions
                const response = await fetch(`/api/quiz?levelNumber=${levelNumber}&rollup=${rollup}`);
                const result = await response.json();
                if (result.success) {
                    setQuestions(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch quiz:", error);
            } finally {
                setFetching(false);
            }
        };
        fetchQuiz();
    }, [levelNumber, rollup]);

    const question = questions[currentQ];

    if (fetching) return null;
    if (questions.length === 0) {
        return (
            <AnimatePresence>
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.85, y: 40 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        className="glass-card w-full max-w-sm p-6 text-center"
                    >
                        <h3 className="text-xl font-black text-white mb-2">施工中 🚧</h3>
                        <p className="text-slate-400 mb-6">這個關卡還沒有題目資料哦！<br />請確認資料庫中的設定。</p>
                        <button className="btn-primary" onClick={onClose}>返回</button>
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    }

    const handleAnswer = (idx: number) => {
        if (answered) return;
        setSelected(idx);
        setAnswered(true);
        if (idx === question.correct) {
            setScore((s) => s + 1);
            setTotalXP((x) => x + question.xp);
        }
    };

    const handleNext = async () => {
        if (currentQ < questions.length - 1) {
            setCurrentQ((q) => q + 1);
            setSelected(null);
            setAnswered(false);
        } else {
            // Finish
            await addXP(totalXP);
            await completeLevel(String(levelId));
            setShowConfetti(true);
            setPhase("result");
        }
    };


    const finalScore = score;
    const finalXP = totalXP;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                {showConfetti && (
                    <Confetti
                        recycle={false}
                        numberOfPieces={300}
                        colors={["#8B5CF6", "#00D4FF", "#FFB800", "#10B981"]}
                    />
                )}

                <motion.div
                    initial={{ scale: 0.85, y: 40 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="glass-card w-full max-w-2xl flex flex-col max-h-[78vh] min-h-[400px] overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-white/10 shrink-0 bg-black/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest">{planetName} · 關卡訓練</p>
                                <h2 className="text-xl font-black gradient-text mt-0.5" style={{ fontFamily: "Orbitron, sans-serif" }}>
                                    GenAI 知識挑戰
                                </h2>
                            </div>
                            <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl transition-colors">×</button>
                        </div>

                        {phase === "quiz" && (
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-slate-400 mb-2">
                                    <span>問題 {currentQ + 1} / {questions.length}</span>
                                    <span className="text-yellow-400 flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        累積 {totalXP} XP
                                    </span>
                                </div>
                                <div className="xp-bar-track">
                                    <div
                                        className="xp-bar-fill"
                                        style={{ width: `${((currentQ) / questions.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                        {/* Intro Phase */}
                        {phase === "intro" && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4 flex flex-col items-center">
                                <div className="text-7xl mb-6 animate-float">⚡</div>
                                <h3 className="text-2xl font-black text-white mb-3">準備好了嗎？</h3>
                                <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                                    這個挑戰包含 {questions.length} 道 GenAI 知識題。答對得 XP，讓我們開始！
                                </p>
                                <div className="glass-card p-4 mb-8 text-sm text-slate-300 w-full max-w-sm">
                                    <div className="flex justify-around">
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-purple-400">{questions.length}</p>
                                            <p className="text-xs text-slate-500">題目數量</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-yellow-400">{questions.reduce((a, q) => a + q.xp, 0)}</p>
                                            <p className="text-xs text-slate-500">最高 XP</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-cyan-400">∞</p>
                                            <p className="text-xs text-slate-500">挑戰次數</p>
                                        </div>
                                    </div>
                                </div>
                                <button className="btn-primary text-lg px-10 py-4" onClick={() => setPhase("quiz")}>
                                    🚀 開始挑戰！
                                </button>
                            </motion.div>
                        )}

                        {/* Quiz Phase */}
                        {phase === "quiz" && (
                            <motion.div
                                key={currentQ}
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                                className="pb-4"
                            >
                                <h3 className="text-lg font-bold text-white mb-6 leading-relaxed">
                                    {question.question}
                                </h3>

                                <div className="space-y-3 mb-6">
                                    {question.options.map((opt, idx) => {
                                        const isCorrect = idx === question.correct;
                                        const isSelected = idx === selected;
                                        return (
                                            <motion.button
                                                key={idx}
                                                whileHover={!answered ? { scale: 1.02 } : {}}
                                                whileTap={!answered ? { scale: 0.98 } : {}}
                                                onClick={() => handleAnswer(idx)}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-3",
                                                    !answered && "glass-card-hover",
                                                    answered && isCorrect && "border-green-500/50 bg-green-500/10 text-green-300",
                                                    answered && isSelected && !isCorrect && "border-red-500/50 bg-red-500/10 text-red-300",
                                                    answered && !isSelected && !isCorrect && "opacity-40 border-white/5"
                                                )}
                                            >
                                                <span className="text-sm font-medium flex-1">{opt}</span>
                                                <span className={cn(
                                                    "w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ml-auto",
                                                    !answered && "border-white/20 text-slate-400",
                                                    answered && isCorrect && "border-green-400 text-green-400 bg-green-900/40",
                                                    answered && isSelected && !isCorrect && "border-red-400 text-red-400 bg-red-900/40",
                                                )}>
                                                    {answered
                                                        ? isCorrect
                                                            ? <CheckCircle2 className="w-4 h-4" />
                                                            : isSelected
                                                                ? <XCircle className="w-4 h-4" />
                                                                : ["A", "B", "C", "D"][idx]
                                                        : ["A", "B", "C", "D"][idx]}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                {/* Explanation */}
                                <AnimatePresence>
                                    {answered && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "p-4 rounded-xl text-sm shadow-md",
                                                selected === question.correct
                                                    ? "bg-green-500/10 border border-green-500/20 text-green-200"
                                                    : "bg-red-500/10 border border-red-500/20 text-red-200"
                                            )}
                                        >
                                            <p className="font-bold mb-1 text-base">
                                                {selected === question.correct ? "🎉 答對了！" : "💡 正確解析："}
                                            </p>
                                            <p className="leading-relaxed opacity-90">{question.explanation}</p>
                                            {selected === question.correct && (
                                                <p className="mt-3 font-bold text-yellow-400 flex items-center gap-1.5 text-base bg-yellow-400/10 px-3 py-1.5 rounded-lg w-max shadow-sm">
                                                    <Zap className="w-4 h-4 flex-shrink-0" />
                                                    +{question.xp} XP 獎勵！
                                                </p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Result Phase */}
                        {phase === "result" && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-6"
                            >
                                <div className="text-7xl mb-4">
                                    {finalScore === questions.length ? "🏆" : finalScore >= questions.length / 2 ? "⭐" : "💪"}
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">
                                    {finalScore === questions.length ? "完美！滿分！" : "挑戰完成！"}
                                </h3>
                                <p className="text-slate-400 mb-6">
                                    答對 {finalScore} / {questions.length} 題
                                </p>

                                <div className="glass-card p-6 mb-8 w-full max-w-sm mx-auto">
                                    <div className="flex justify-around">
                                        <div className="text-center flex flex-col items-center">
                                            <p className="text-3xl font-black text-purple-400">{finalScore}/{questions.length}</p>
                                            <p className="text-xs text-slate-500 mt-1">正確題數</p>
                                        </div>
                                        <div className="text-center flex flex-col items-center">
                                            <p className="text-3xl font-black text-yellow-400">+{finalXP}</p>
                                            <p className="text-xs text-slate-500 mt-1">獲得 XP</p>
                                        </div>
                                        <div className="text-center flex flex-col items-center">
                                            <p className="text-3xl font-black text-cyan-400">
                                                {Math.round((finalScore / questions.length) * 100)}%
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">準確率</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-center">
                                    <button className="btn-secondary" onClick={() => {
                                        setPhase("quiz");
                                        setCurrentQ(0);
                                        setSelected(null);
                                        setAnswered(false);
                                        setScore(0);
                                        setTotalXP(0);
                                        setShowConfetti(false);
                                    }}>
                                        再挑戰一次
                                    </button>
                                    <button className="btn-primary" onClick={onClose}>
                                        繼續探索
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Fixed Footer Phase: Only show the next button for Quiz Phase when answered */}
                    {phase === "quiz" && answered && (
                        <div className="p-4 sm:p-6 bg-black/30 border-t border-white/10 shrink-0 backdrop-blur-md">
                            <button
                                className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4 shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse hover:animate-none"
                                onClick={handleNext}
                            >
                                {currentQ < questions.length - 1 ? (
                                    <>
                                        下一題 <ChevronRight className="w-5 h-5" />
                                    </>
                                ) : (
                                    <>
                                        查看結果 <Trophy className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
