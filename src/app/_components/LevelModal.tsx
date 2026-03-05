"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { type QuizQuestion } from "@/types/game";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import FomoBird from "@/components/icons/FomoBird";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

interface LevelModalProps {
    onClose: () => void;
    planetName: string;
    levelTitle: string;
    levelId: string | number;
    levelNumber: number;
    rollup: string;
}

export default function LevelModal({ onClose, planetName, levelTitle, levelId, levelNumber, rollup }: LevelModalProps) {
    const { addXP, completeLevel } = useGameStore();
    const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
    const [currentQ, setCurrentQ] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [totalXP, setTotalXP] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [fetching, setFetching] = useState(true);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#090812]/90 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#1D1C44] border-[4px] border-[#0A0A26] rounded-[40px] w-full max-w-sm p-10 text-center shadow-[0_16px_0_#0A0A26]"
                    >
                        <div className="mb-6 flex justify-center">
                            <FomoBird expression="thinking" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4 italic tracking-tighter">EMPTY VOID</h3>
                        <p className="text-[#A5A5D9] mb-8 font-bold text-lg">Our space birds haven't mapped this sector yet!</p>
                        <button
                            className="w-full bg-[#FF7E5F] text-white border-[4px] border-[#0A0A26] shadow-[0_8px_0_#0A0A26] rounded-2xl px-6 py-4 text-xl font-black uppercase tracking-wider active:translate-y-1 active:shadow-[0_4px_0_#0A0A26] transition-all"
                            onClick={onClose}
                        >
                            Return to Ship
                        </button>
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    }

    const handleSelectOption = (idx: number) => {
        if (answered) return;
        setPendingAnswer(idx);
    };

    const handleConfirmAnswer = () => {
        if (pendingAnswer === null || answered) return;
        setSelected(pendingAnswer);
        setAnswered(true);
        if (pendingAnswer === question.correct) {
            setScore((s) => s + 1);
            setTotalXP((x) => x + question.xp);
        }
    };

    const handleNext = async () => {
        if (currentQ < questions.length - 1) {
            setCurrentQ((q) => q + 1);
            setSelected(null);
            setAnswered(false);
            setPendingAnswer(null);
        } else {
            await addXP(totalXP);
            await completeLevel(String(levelId));
            setShowConfetti(true);
            setPhase("result");
        }
    };

    const handleExitQuiz = async () => {
        setShowExitConfirm(false);
        // Award XP for correct answers given so far
        if (totalXP > 0) {
            await addXP(totalXP);
        }
        onClose();
    };

    const handleCloseClick = () => {
        if (phase === "quiz") {
            setShowExitConfirm(true);
        } else {
            onClose();
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-[#090812]/95 p-4 sm:p-6 overflow-hidden"
            >
                {/* Space decoration elements */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-white"
                            style={{
                                width: Math.random() * 6 + 2 + "px",
                                height: Math.random() * 6 + 2 + "px",
                                top: Math.random() * 100 + "%",
                                left: Math.random() * 100 + "%",
                                opacity: Math.random() * 0.5 + 0.3,
                            }}
                        />
                    ))}
                </div>

                {showConfetti && (
                    <Confetti recycle={false} numberOfPieces={300} colors={["#FF7E5F", "#4EEAFF", "#FEB47B", "#58CC02"]} />
                )}

                <motion.div
                    initial={{ scale: 0.9, y: 50, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="w-full max-w-2xl bg-[#1D1C44] border-[4px] border-[#0A0A26] rounded-[40px] flex flex-col max-h-[95vh] min-h-[600px] overflow-hidden relative shadow-[0_20px_0_#0A0A26] z-10"
                >
                    {/* Header with Close Button inside flex container */}
                    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col scrollbar-hide">
                        <div className="px-6 pt-6 sm:px-10 sm:pt-8 flex justify-end">
                            <button
                                onClick={handleCloseClick}
                                className="w-12 h-12 bg-[#2a1f45] border-[4px] border-[#0A0A26] shadow-[0_6px_0_#0A0A26] rounded-2xl text-white font-black text-2xl flex items-center justify-center hover:bg-[#3d2f63] active:translate-y-1 active:shadow-[0_2px_0_#0A0A26] transition-all"
                            >
                                ×
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {/* Intro Phase */}
                            {phase === "intro" && (
                                <motion.div
                                    key="intro"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="p-8 sm:p-14 text-center flex flex-col items-center justify-center flex-1"
                                >
                                    <h2 className="text-4xl sm:text-6xl font-black text-white mb-2 uppercase tracking-tighter leading-tight italic">{levelTitle || planetName}</h2>
                                    <h3 className="text-2xl font-bold text-[#A5A5D9] mb-8 uppercase tracking-[0.2em]">Knowledge Briefing</h3>

                                    <div className="bg-[#15113B] border-[3px] border-[#0A0A26] rounded-[32px] p-6 mb-12 max-w-md w-full relative">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF7E5F] px-4 py-1 rounded-full border-[2px] border-[#0A0A26] text-white font-black text-xs uppercase tracking-widest">
                                            MISSION LOG
                                        </div>
                                        <p className="text-[#A5A5D9] text-lg font-bold italic leading-relaxed pt-2">
                                            "Landing procedures require valid neural data. Correct responses generate the energy needed for descent."
                                        </p>
                                    </div>

                                    <div className="flex gap-4 mb-12 w-full max-w-md">
                                        <div className="flex-1 bg-[#15113B] rounded-2xl p-4 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-black text-white">{questions.length}</span>
                                            <span className="text-[10px] font-black text-[#A5A5D9] uppercase tracking-widest">Neural Tests</span>
                                        </div>
                                        <div className="flex-1 bg-[#15113B] rounded-2xl p-4 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-black text-white">{questions.reduce((a, q) => a + q.xp, 0)}</span>
                                            <span className="text-[10px] font-black text-[#A5A5D9] uppercase tracking-widest">Total XP</span>
                                        </div>
                                    </div>

                                    <button
                                        className="w-full max-w-md bg-[#58CC02] text-white border-[4px] border-[#0A0A26] shadow-[0_12px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] rounded-[28px] px-8 py-6 text-2xl font-black uppercase tracking-widest active:translate-y-2 active:shadow-[0_4px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] transition-all hover:brightness-110"
                                        onClick={() => setPhase("quiz")}
                                    >
                                        Start
                                    </button>
                                </motion.div>
                            )}

                            {/* Quiz Phase */}
                            {phase === "quiz" && (
                                <motion.div
                                    key="quiz"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="p-8 sm:p-12 flex flex-col h-full flex-1 relative"
                                >
                                    {/* Progress header */}
                                    <div className="mb-10">
                                        <div className="w-full h-8 bg-[#0A0A26] rounded-full p-[4px] relative overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.max(((currentQ) / questions.length) * 100, 5)}%` }}
                                                className="h-full bg-[#05d9e8] rounded-full relative"
                                                transition={{ duration: 0.8, type: "spring" }}
                                            >
                                                <div className="absolute top-0 bottom-0 right-0 w-8 bg-white/20 blur-sm rounded-full" />
                                            </motion.div>
                                        </div>
                                    </div>

                                    <div className="mb-10 bg-[#15113B] p-8 rounded-[32px] border-[3px] border-[#0A0A26] shadow-[inset_0_4px_0_rgba(255,255,255,0.05)]">
                                        <h3 className="text-2xl sm:text-3xl font-black text-white leading-[1.3] flex gap-5">
                                            <span className="text-[#FF7E5F] shrink-0 text-4xl">?</span>
                                            {question.question}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5 mb-10 overflow-y-auto px-1 py-2 scrollbar-hide">
                                        {question.options.map((opt, idx) => {
                                            const isCorrect = idx === question.correct;
                                            const isSelected = idx === selected;
                                            const isPending = pendingAnswer === idx;

                                            let btnClass = "bg-[#15113B] border-[#0A0A26] text-white shadow-[0_10px_0_#0A0A26]";
                                            let icon = (idx + 1).toString();

                                            if (answered) {
                                                if (isCorrect) {
                                                    btnClass = "bg-[#58cc02] border-[#0A0A26] text-[#0a0710] shadow-[0_10px_0_#0A0A26] scale-[1.02]";
                                                    icon = "✓";
                                                } else if (isSelected && !isCorrect) {
                                                    btnClass = "bg-[#FF1E56] border-[#0A0A26] text-white shadow-[0_10px_0_#0A0A26]";
                                                    icon = "×";
                                                } else {
                                                    btnClass = "bg-[#15113B] border-[#0A0A26] text-[#6b6b9e] opacity-40 shadow-[0_6px_0_#0A0A26]";
                                                }
                                            } else if (isPending) {
                                                btnClass = "bg-[#05d9e8] border-[#0A0A26] text-[#0a0710] shadow-[0_10px_0_#0A0A26] -translate-y-1";
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    disabled={answered}
                                                    onClick={() => handleSelectOption(idx)}
                                                    className={cn(
                                                        "relative w-full text-left p-6 rounded-[28px] border-[4px] transition-all duration-400 font-bold text-lg sm:text-xl flex items-center gap-6",
                                                        btnClass,
                                                        !answered && !isPending && "hover:bg-[#201d5c] hover:-translate-y-1 active:translate-y-1 active:shadow-[0_4px_0_#0A0A26]",
                                                        answered && "cursor-default"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl transition-colors",
                                                        answered
                                                            ? (isCorrect ? "bg-white/30 text-[#0a0710]" : (isSelected ? "bg-white/30 text-white" : "bg-black/10 text-white/20"))
                                                            : "bg-[#2a2a6e] text-white border-[3px] border-[#0A0A26]"
                                                    )}>
                                                        {icon}
                                                    </div>
                                                    <span className="flex-1 leading-snug">{opt}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Confirm Send button — appears when an option is selected but not yet submitted */}
                                    {pendingAnswer !== null && !answered && (
                                        <div className="fixed bottom-8 left-0 right-0 px-8 flex justify-center z-[60] pointer-events-none">
                                            <button
                                                onClick={handleConfirmAnswer}
                                                className="w-full max-w-2xl pointer-events-auto py-6 bg-[#05d9e8] text-[#0a0710] border-[4px] border-[#0A0A26] shadow-[0_12px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] rounded-[28px] font-black text-2xl uppercase tracking-widest active:translate-y-2 active:shadow-[0_4px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] transition-all hover:brightness-110 flex items-center justify-center gap-3"
                                            >
                                                <CheckCircle2 className="w-7 h-7" />
                                                Send
                                            </button>
                                        </div>
                                    )}

                                    <AnimatePresence>
                                        {answered && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 120 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 120 }}
                                                className="fixed bottom-0 left-0 right-0 p-8 sm:p-12 z-50 pointer-events-none"
                                            >
                                                <div className="max-w-2xl mx-auto pointer-events-auto">
                                                    <div className={cn(
                                                        "p-8 sm:p-10 rounded-[44px] border-[5px] border-[#0A0A26] shadow-[0_20px_0_#0A0A26] flex flex-col items-center gap-6 text-center",
                                                        selected === question.correct ? "bg-[#58cc02]" : "bg-[#FF1E56]"
                                                    )}>
                                                        <div className="flex-1">
                                                            <div className="flex flex-col items-center gap-3 mb-4">
                                                                <h5 className="font-black text-4xl text-white uppercase italic tracking-tighter">
                                                                    {selected === question.correct ? "BINGO!" : "GAP!"}
                                                                </h5>
                                                            </div>
                                                            <div className="bg-black/10 p-5 rounded-3xl border-[2px] border-black/5 mb-8">
                                                                <p className="text-white font-bold text-lg leading-[1.4] max-w-lg mx-auto">
                                                                    {question.explanation}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={handleNext}
                                                                className="w-full sm:w-auto min-w-[220px] bg-white text-[#0A0A26] border-[4px] border-[#0A0A26] shadow-[0_10px_0_#0A0A26] rounded-3xl px-10 py-5 text-2xl font-black uppercase tracking-widest active:translate-y-1 active:shadow-[0_4px_0_#0A0A26] transition-all hover:bg-white/90"
                                                            >
                                                                {currentQ < questions.length - 1 ? "NEXT" : "ANALYZE"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Exit confirmation modal */}
                                    {showExitConfirm && (
                                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
                                            <div className="bg-[#1b1236] border-[6px] border-[#100a1f] rounded-[40px] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
                                                <div className="w-20 h-20 bg-[#ff9600] rounded-full flex items-center justify-center mx-auto shadow-[0_8px_0_#cc7800] border-b-4 border-[#cc7800]">
                                                    <AlertTriangle className="w-10 h-10 text-white" />
                                                </div>
                                                <h3 className="text-2xl font-black text-white tracking-tight">
                                                    Abort Mission?
                                                </h3>
                                                <p className="text-[#b8aae0] font-bold text-sm leading-relaxed">
                                                    {totalXP > 0
                                                        ? `You'll keep the ${totalXP} XP earned so far, but won't complete this level.`
                                                        : "Your current progress will be lost and you'll need to start over."}
                                                </p>
                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        onClick={handleExitQuiz}
                                                        className="w-full py-5 bg-[#251847] text-[#ff2262] rounded-[24px] font-black text-lg border-b-[6px] border-[#19102e] tracking-widest hover:bg-[#2d1d56]"
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        onClick={() => setShowExitConfirm(false)}
                                                        className="w-full py-5 bg-[#05d9e8] text-[#0a0710] rounded-[24px] font-black text-lg border-b-[6px] border-[#03b8c4] tracking-widest"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Result Phase */}
                            {phase === "result" && (
                                <motion.div
                                    key="result"
                                    initial={{ opacity: 0, scale: 1.1 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-10 sm:p-16 text-center flex flex-col items-center justify-center flex-1"
                                >
                                    <div className="relative mb-12">
                                        <div className="w-40 h-40 bg-[#4EEAFF] rounded-full flex items-center justify-center border-[5px] border-[#0A0A26] shadow-[0_15px_0_#0A0A26] animate-[bounce_2s_infinite]">
                                            <FomoBird className="w-28 h-28" expression="happy" />
                                        </div>
                                        <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#FEB47B] rounded-full border-[4px] border-[#0A0A26] flex items-center justify-center font-black text-3xl text-white shadow-lg">
                                            ★
                                        </div>
                                    </div>

                                    <h2 className="text-6xl sm:text-8xl font-black text-white mb-6 uppercase tracking-tighter leading-tight italic drop-shadow-[0_8px_0_#0A0A26]">
                                        {score === questions.length ? "GOD-LIKE!" : "DECODED"}
                                    </h2>

                                    <div className="bg-[#15113B] border-[5px] border-[#0A0A26] rounded-[48px] p-10 sm:p-14 w-full max-w-sm mb-12 shadow-[0_18px_0_#0A0A26] relative overflow-hidden">
                                        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                                        <p className="text-[#A5A5D9] font-black uppercase tracking-[0.4em] text-xs mb-6 relative z-10">Neural Intelligence Gain</p>
                                        <div className="flex items-center justify-center gap-4 mb-4 relative z-10">
                                            <span className="text-4xl text-[#FEB47B] font-black">+</span>
                                            <p className="text-[90px] sm:text-[110px] font-black text-[#FEB47B] leading-none drop-shadow-[0_8px_0_#000]">
                                                {totalXP}
                                            </p>
                                        </div>
                                        <p className="text-white font-black text-2xl relative z-10 uppercase tracking-widest bg-black/30 py-2 rounded-2xl border-[2px] border-white/5">
                                            {score} / {questions.length} CORRECT
                                        </p>

                                        {/* Abstract decoration */}
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF7E5F] opacity-10 rounded-full translate-x-16 -translate-y-16" />
                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#4EEAFF] opacity-10 rounded-full -translate-x-12 translate-y-12" />
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-8 w-full max-w-lg">
                                        <button
                                            className="flex-1 bg-[#2a1f45] text-white border-[4px] border-[#0A0A26] shadow-[0_10px_0_#0A0A26] rounded-3xl px-8 py-6 text-2xl font-black uppercase tracking-widest active:translate-y-1 active:shadow-[0_4px_0_#0A0A26] transition-all hover:bg-[#3d2f63]"
                                            onClick={() => {
                                                setPhase("quiz");
                                                setCurrentQ(0);
                                                setSelected(null);
                                                setAnswered(false);
                                                setPendingAnswer(null);
                                                setScore(0);
                                                setTotalXP(0);
                                                setShowConfetti(false);
                                            }}
                                        >
                                            REPLAY
                                        </button>
                                        <button
                                            className="flex-[2] bg-[#FF7E5F] text-white border-[4px] border-[#0A0A26] shadow-[0_10px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] rounded-3xl px-8 py-6 text-2xl font-black uppercase tracking-widest active:translate-y-1 active:shadow-[0_4px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] transition-all hover:brightness-110"
                                            onClick={onClose}
                                        >
                                            LOG DATA
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
