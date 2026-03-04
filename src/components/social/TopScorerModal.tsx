"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import FomoBird from "@/components/icons/FomoBird";
import { cn } from "@/lib/utils";

export default function TopScorerModal() {
    const { topScorer, setTopScorerMessage } = useGameStore();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (topScorer.isTopScorer && !topScorer.hasMessageToday) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [topScorer.isTopScorer, topScorer.hasMessageToday]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!message.trim() || message.length > 20) return;

        setIsSubmitting(true);
        try {
            await setTopScorerMessage(message);
        } catch (error) {
            console.error("Failed to set message:", error);
        } finally {
            setIsSubmitting(false);
            setIsOpen(false);
        }
    };

    const handleQuickReuse = () => {
        if (topScorer.yesterdayMessage) {
            setMessage(topScorer.yesterdayMessage);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-[#1D1C44] border-4 border-[#0A0A26] rounded-3xl p-8 shadow-[8px_8px_0px_0px_#0A0A26]"
                >
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 relative">
                            <div className="absolute -top-4 -right-8 bg-[#FFE100] text-[#0A0A26] font-black px-3 py-1 rounded-full border-2 border-[#0A0A26] rotate-12 text-sm shadow-sm z-10">
                                TOP SCORER!
                            </div>
                            <FomoBird expression="happy" className="w-32 h-32 drop-shadow-lg" />
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">
                            Victory Message
                        </h2>
                        <p className="text-slate-300 mb-6 font-medium text-sm">
                            You're currently <span className="text-[#FFE100] font-bold">#1 among your friends</span>! <br />
                            Let them know who's boss (max 20 chars).
                        </p>

                        <form onSubmit={handleSubmit} className="w-full space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value.slice(0, 20))}
                                    placeholder="Type your message..."
                                    className="w-full bg-[#0D0D2B] border-4 border-[#0A0A26] rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#4EEAFF] transition-colors placeholder:text-slate-600"
                                    maxLength={20}
                                    autoFocus
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                                    {message.length}/20
                                </div>
                            </div>

                            {topScorer.yesterdayMessage && (
                                <button
                                    type="button"
                                    onClick={handleQuickReuse}
                                    className="text-[#4EEAFF] text-xs font-bold hover:underline underline-offset-2 flex items-center justify-center gap-2 w-full transition-all active:scale-95"
                                >
                                    <span>🔄 Reuse yesterday's: "{topScorer.yesterdayMessage}"</span>
                                </button>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 bg-slate-700 border-b-4 border-slate-900 text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-600 transition-all active:translate-y-1 active:border-b-0"
                                >
                                    SKIP
                                </button>
                                <button
                                    type="submit"
                                    disabled={!message.trim() || isSubmitting}
                                    className={cn(
                                        "flex-[2] bg-[#FFE100] border-b-4 border-[#B29D00] text-[#0A0A26] font-black py-3 rounded-xl transition-all active:translate-y-0.5 active:border-b-0",
                                        (!message.trim() || isSubmitting) && "opacity-50 grayscale cursor-not-allowed"
                                    )}
                                >
                                    {isSubmitting ? "SENDING..." : "BROADCAST"}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
