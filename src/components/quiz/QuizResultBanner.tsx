"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizResultBannerProps {
    visible: boolean;
    isCorrect: boolean;
    explanation: string;
    isLastQuestion: boolean;
    onNext: () => void;
}

/**
 * Result banner showing "BINGO!" / "GAP!" with an explanation toggle.
 * Shared between LevelModal and NewsPage quiz flows.
 */
export default function QuizResultBanner({
    visible,
    isCorrect,
    explanation,
    isLastQuestion,
    onNext,
}: QuizResultBannerProps) {
    const [showExplanation, setShowExplanation] = useState(false);

    // Reset explanation visibility when the banner becomes invisible (question changes)
    // We use a key-based reset instead — see the key prop on AnimatePresence children

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key={explanation} // Reset internal state when question changes
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="w-full z-10 mb-8"
                >
                    <div className={cn(
                        "p-8 sm:p-10 rounded-[44px] border-[5px] border-[#0A0A26] shadow-[0_20px_0_#0A0A26] flex flex-col items-center gap-6 text-center",
                        isCorrect ? "bg-[#58cc02]" : "bg-[#FF1E56]"
                    )}>
                        <div className="flex-1 w-full">
                            <div className="flex flex-col items-center gap-3 mb-4">
                                <h5 className="font-black text-4xl text-white uppercase italic tracking-tighter">
                                    {isCorrect ? "BINGO!" : "GAP!"}
                                </h5>
                            </div>

                            {/* Show explanation always if incorrect, or if correct and toggled */}
                            {(!isCorrect || showExplanation) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="bg-black/10 p-5 rounded-3xl border-[2px] border-black/5 mb-8"
                                >
                                    <p className="text-white font-bold text-lg leading-[1.4] max-w-lg mx-auto">
                                        {explanation}
                                    </p>
                                </motion.div>
                            )}

                            <div className="flex gap-4 w-full justify-center">
                                {isCorrect && !showExplanation && (
                                    <button
                                        onClick={() => setShowExplanation(true)}
                                        className="w-16 h-16 bg-white/20 text-white border-[4px] border-[#0A0A26] shadow-[0_8px_0_#0A0A26] rounded-2xl flex items-center justify-center active:translate-y-1 active:shadow-[0_4px_0_#0A0A26] transition-all hover:bg-white/30"
                                    >
                                        <Info className="w-8 h-8" />
                                    </button>
                                )}
                                <button
                                    onClick={onNext}
                                    className={cn(
                                        "flex-1 max-w-[300px] bg-white text-[#0A0A26] border-[4px] border-[#0A0A26] shadow-[0_10px_0_#0A0A26] rounded-3xl px-10 py-5 text-2xl font-black uppercase tracking-widest active:translate-y-1 active:shadow-[0_4px_0_#0A0A26] transition-all hover:bg-white/90",
                                        !isCorrect && "w-full"
                                    )}
                                >
                                    {isLastQuestion ? "ANALYZE" : "NEXT"}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
