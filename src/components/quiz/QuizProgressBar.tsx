"use client";
import { motion } from "framer-motion";

interface QuizProgressBarProps {
    current: number;
    total: number;
}

/**
 * Animated progress bar for quiz progression.
 * Shared between LevelModal and NewsPage quiz flows.
 */
export default function QuizProgressBar({ current, total }: QuizProgressBarProps) {
    const percentage = Math.max((current / total) * 100, 5);

    return (
        <div className="mb-10">
            <div className="w-full h-8 bg-[#0A0A26] rounded-full p-[4px] relative overflow-hidden shadow-inner">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-full bg-[#05d9e8] rounded-full relative"
                    transition={{ duration: 0.8, type: "spring" }}
                >
                    <div className="absolute top-0 bottom-0 right-0 w-8 bg-white/20 blur-sm rounded-full" />
                </motion.div>
            </div>
        </div>
    );
}
