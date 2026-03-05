"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface QuizConfirmButtonProps {
    visible: boolean;
    onConfirm: () => void;
}

/**
 * Animated "Send" button that appears when a quiz option is selected
 * but not yet submitted. Shared between LevelModal and NewsPage.
 */
export default function QuizConfirmButton({ visible, onConfirm }: QuizConfirmButtonProps) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full mb-8"
                >
                    <button
                        onClick={onConfirm}
                        className="w-full py-6 bg-[#05d9e8] text-[#0a0710] border-[4px] border-[#0A0A26] shadow-[0_12px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] rounded-[28px] font-black text-2xl uppercase tracking-widest active:translate-y-2 active:shadow-[0_4px_0_#0A0A26,inset_0_-8px_0_rgba(0,0,0,0.1)] transition-all hover:brightness-110 flex items-center justify-center gap-3"
                    >
                        <CheckCircle2 className="w-7 h-7" />
                        Send
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
