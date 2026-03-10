"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Loader2,
    Check,
    ArrowRight,
    ShieldAlert,
    ChevronLeft,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreToTier } from "@/lib/game";
import { type ProfileOption } from "@/types/game";
import FomoBird from "@/components/icons/FomoBird";

/**
 * KURZGESAGT REVAMP: PROFILE SETUP
 * Guided by FomoBird, high-impact vector aesthetic.
 */

interface ProfileSetupModalProps {
    open: boolean;
    onComplete: (score: number) => void;
}

type SetupStep = "welcome" | "backgrounds" | "sectors" | "calibration";

export default function ProfileSetupModal({
    open,
    onComplete,
}: ProfileSetupModalProps) {
    const [step, setStep] = useState<SetupStep>("welcome");
    const [bgOptions, setBgOptions] = useState<ProfileOption[]>([]);
    const [sectorOptions, setSectorOptions] = useState<ProfileOption[]>([]);

    // Selection state
    const [selectedBg, setSelectedBg] = useState<string | null>(null);
    const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [finalScore, setFinalScore] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/user/profile/options");
                const data = await res.json();
                if (!data.success) throw new Error(data.error);
                setBgOptions(data.backgrounds);
                setSectorOptions(data.interests);
            } catch (err) {
                setError("Neural link unstable. System offline.");
            } finally {
                setLoading(false);
            }
        })();
    }, [open]);

    const handleBgClick = (key: string) => {
        setSelectedBg(key);
        setTimeout(() => setStep("sectors"), 400);
    };

    const toggleSector = (key: string) => {
        setSelectedSectors((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const runCalibration = async () => {
        if (!selectedBg || selectedSectors.size === 0) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/user/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    background: selectedBg,
                    interests: Array.from(selectedSectors),
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setFinalScore(data.difficulty_score);
            setStep("calibration");
        } catch (err) {
            setError("Calibration failed. Neural interference detected.");
            setSubmitting(false);
        }
    };

    const RANK_MAP: Record<number, { label: string; color: string; bg: string }> = {
        1: { label: "NOVICE", color: "#4EEAFF", bg: "bg-[#00D4FF]" },
        2: { label: "BASIC", color: "#58CC02", bg: "bg-[#58CC02]" },
        3: { label: "ADEPT", color: "#FFB800", bg: "bg-[#FFB800]" },
        4: { label: "EXPERT", color: "#FF9600", bg: "bg-[#FF9600]" },
        5: { label: "MASTER", color: "#FF1E56", bg: "bg-[#FF1E56]" },
    };

    const getRank = (score: number) => {
        const tier = scoreToTier(score);
        return { ...RANK_MAP[tier], tier };
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex flex-col bg-[#1D1C44] text-white font-['Inter'] overflow-hidden"
            >
                {/* Visual Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(78,234,255,0.15),transparent_70%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:60px_60px]" />
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-12 relative z-10 flex flex-col items-center">
                    <div className="w-full max-w-4xl flex-1 flex flex-col min-h-0">

                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-8">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="relative w-32 h-32"
                                >
                                    <div className="absolute inset-0 border-[8px] border-[#4EEAFF]/20 rounded-full" />
                                    <div className="absolute inset-0 border-[8px] border-[#4EEAFF] rounded-full border-t-transparent animate-[spin_1.5s_infinite_linear]" />
                                </motion.div>
                                <p className="text-[#4EEAFF] font-black tracking-[0.3em] text-sm uppercase animate-pulse">Synchronizing Neural Path...</p>
                            </div>
                        ) : error ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-md mx-auto">
                                <div className="w-32 h-32 bg-[#FF1E56] rounded-full border-[5px] border-[#0A0A26] flex items-center justify-center shadow-[0_12px_0_#0A0A26]">
                                    <ShieldAlert className="w-16 h-16 text-white" />
                                </div>
                                <h2 className="text-4xl font-black tracking-tight text-white uppercase italic">Critical Error</h2>
                                <p className="text-[#d4c5f9] font-bold text-lg leading-relaxed">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full py-5 bg-white text-[#1D1C44] border-[4px] border-[#0A0A26] shadow-[0_8px_0_#0A0A26] rounded-3xl font-black text-xl hover:translate-y-1 active:shadow-none transition-all"
                                >
                                    RETRY LINK
                                </button>
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                {step === "welcome" && (
                                    <motion.div
                                        key="step-welcome"
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex-1 flex flex-col items-center justify-center text-center space-y-10"
                                    >
                                        <div className="relative">
                                            <div className="w-48 h-48 bg-[#FFE100] rounded-full flex items-center justify-center border-[6px] border-[#0A0A26] shadow-[0_15px_0_#0A0A26]">
                                                <FomoBird className="w-32 h-32" expression="happy" />
                                            </div>
                                            <div className="absolute -top-4 -right-4 w-14 h-14 bg-[#4EEAFF] rounded-full border-[4px] border-[#0A0A26] flex items-center justify-center shadow-lg">
                                                <Sparkles className="w-8 h-8 text-white" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none italic uppercase italic drop-shadow-[0_8px_0_#0A0A26]">
                                                Welcome, <br /> Operative
                                            </h1>
                                            <p className="text-xl md:text-2xl text-[#d4c5f9] font-bold max-w-lg mx-auto leading-relaxed">
                                                To secure the GenAI Sector, we must calibrate your neural interface. Ready to begin?
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => setStep("backgrounds")}
                                            className="group relative px-12 py-6 bg-[#FF7E5F] text-white border-[5px] border-[#0A0A26] shadow-[0_12px_0_#0A0A26] rounded-[40px] font-black text-3xl tracking-tight transition-all hover:translate-y-1 hover:shadow-[0_8px_0_#0A0A26] active:translate-y-2 active:shadow-none flex items-center gap-4"
                                        >
                                            INITIALIZE <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                                        </button>
                                    </motion.div>
                                )}

                                {step === "backgrounds" && (
                                    <motion.div
                                        key="step-bg"
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        className="space-y-12"
                                    >
                                        <div className="flex items-center gap-8 bg-black/20 p-8 rounded-[40px] border-[4px] border-[#0A0A26]">
                                            <FomoBird className="w-24 h-24 shrink-0" expression="thinking" />
                                            <div>
                                                <h2 className="text-4xl font-black tracking-tight uppercase italic text-[#FFE100]">Experience level?</h2>
                                                <p className="text-[#d4c5f9] font-bold text-lg">Select the profile that best matches your current expertise.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 pb-12">
                                            {bgOptions.map((opt) => (
                                                <button
                                                    key={opt.key}
                                                    onClick={() => handleBgClick(opt.key)}
                                                    className={cn(
                                                        "group p-8 rounded-[40px] border-[5px] transition-all flex items-center gap-8 relative overflow-hidden",
                                                        selectedBg === opt.key
                                                            ? "bg-[#4EEAFF] border-[#0A0A26] text-[#1D1C44] shadow-[0_10px_0_#0A0A26] scale-[1.02]"
                                                            : "bg-[#15113B] border-[#0A0A26] hover:bg-[#241a47] text-white shadow-[0_8px_0_#0A0A26] hover:translate-y-[-4px]"
                                                    )}
                                                >
                                                    <span className="text-6xl group-hover:scale-110 transition-transform">{opt.icon}</span>
                                                    <div className="text-left">
                                                        <span className="block font-black text-2xl tracking-tight uppercase">{opt.label}</span>
                                                        <span className={cn("text-sm font-bold opacity-70 block mt-1", selectedBg === opt.key ? "text-[#1D1C44]" : "text-[#d4c5f9]")}>
                                                            {opt.description || "Intelligence profile verified."}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {step === "sectors" && (
                                    <motion.div
                                        key="step-sectors"
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        className="space-y-12 pb-32"
                                    >
                                        <div className="flex items-center gap-8 bg-black/20 p-8 rounded-[40px] border-[4px] border-[#0A0A26]">
                                            <FomoBird className="w-24 h-24 shrink-0" expression="surprised" />
                                            <div>
                                                <h2 className="text-4xl font-black tracking-tight uppercase italic text-[#FFE100]">Sector Focus?</h2>
                                                <p className="text-[#d4c5f9] font-bold text-lg">Which intelligence sectors should we prioritize for your dashboard?</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-center gap-4">
                                            {sectorOptions.map((opt) => {
                                                const isActive = selectedSectors.has(opt.key);
                                                return (
                                                    <button
                                                        key={opt.key}
                                                        onClick={() => toggleSector(opt.key)}
                                                        className={cn(
                                                            "px-8 py-5 rounded-[30px] border-[4px] font-black text-xl transition-all flex items-center gap-4 shadow-lg",
                                                            isActive
                                                                ? "bg-[#FFE100] border-[#0A0A26] text-[#1D1C44] shadow-[0_6px_0_#0A0A26]"
                                                                : "bg-[#15113B] border-[#0A0A26] text-white hover:bg-[#241a47]"
                                                        )}
                                                    >
                                                        <span className="text-3xl">{opt.icon}</span>
                                                        {opt.label}
                                                        {isActive && <Check className="w-6 h-6 ml-2" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}

                                {step === "calibration" && finalScore !== null && (
                                    <motion.div
                                        key="step-calibration"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex-1 flex flex-col items-center justify-center text-center space-y-12 py-8"
                                    >
                                        <div className="space-y-4">
                                            <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase drop-shadow-[0_8px_0_#0A0A26]">CALIBRATED</h2>
                                            <p className="text-[#4EEAFF] font-black tracking-[0.4em] text-sm uppercase">Neural interface synchronized</p>
                                        </div>

                                        <div className="relative group">
                                            <div className={cn(
                                                "w-64 h-64 md:w-80 md:h-80 rounded-[64px] border-[8px] border-[#0A0A26] flex flex-col items-center justify-center relative z-10 transition-transform group-hover:rotate-2",
                                                getRank(finalScore).bg
                                            )}>
                                                <div className="text-[8rem] md:text-[10rem] font-black tracking-tighter leading-none text-white drop-shadow-[0_8px_0_rgba(0,0,0,0.2)]">
                                                    {finalScore}
                                                </div>
                                                <div className="text-2xl md:text-3xl font-black tracking-widest uppercase text-[#0A0A26] mt-[-10px]">
                                                    {getRank(finalScore).label}
                                                </div>
                                            </div>
                                            {/* Shadow element */}
                                            <div className="absolute inset-x-0 bottom-[-20px] h-20 bg-black/40 blur-2xl rounded-full" />
                                            {/* Corner icons */}
                                            <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#FF7E5F] rounded-2xl border-[4px] border-[#0A0A26] flex items-center justify-center shadow-lg rotate-12">
                                                <Sparkles className="w-10 h-10 text-white" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 bg-black/20 p-6 rounded-[32px] border-[3px] border-[#0A0A26] max-w-md mx-auto">
                                            <FomoBird className="w-20 h-20 shrink-0" expression="happy" />
                                            <p className="text-[#d4c5f9] font-bold text-lg leading-tight text-left">
                                                Excellent. Your intel radar is set to <span className="text-white">Tier {getRank(finalScore).tier}</span>. Operation ready.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* Navigation Bar */}
                {!loading && !error && step !== "welcome" && (
                    <div className="sticky bottom-0 left-0 right-0 p-8 flex justify-center bg-gradient-to-t from-[#1D1C44] via-[#1D1C44] to-transparent relative z-20">
                        <div className="w-full max-w-4xl flex gap-6">
                            {step !== "calibration" && (
                                <>
                                    <button
                                        onClick={() => setStep(step === "sectors" ? "backgrounds" : "welcome")}
                                        className="h-20 w-20 bg-[#15113B] border-[4px] border-[#0A0A26] shadow-[0_6px_0_#0A0A26] rounded-3xl flex items-center justify-center hover:translate-y-1 active:shadow-none transition-all group"
                                    >
                                        <ChevronLeft className="w-10 h-10 group-hover:scale-110 transition-transform" />
                                    </button>

                                    {step === "sectors" && (
                                        <button
                                            disabled={selectedSectors.size === 0 || submitting}
                                            onClick={runCalibration}
                                            className="flex-1 h-20 bg-[#58CC02] border-[5px] border-[#0A0A26] shadow-[0_10px_0_#0A0A26] active:translate-y-[10px] active:shadow-none rounded-[32px] font-black text-2xl tracking-widest flex items-center justify-center gap-4 transition-all disabled:opacity-50 disabled:pointer-events-none uppercase italic"
                                        >
                                            {submitting ? (
                                                <Loader2 className="w-10 h-10 animate-spin" />
                                            ) : (
                                                <>Sync Interface <ArrowRight /></>
                                            )}
                                        </button>
                                    )}
                                </>
                            )}

                            {step === "calibration" && (
                                <button
                                    onClick={() => onComplete(finalScore!)}
                                    className="w-full py-8 bg-[#4EEAFF] text-[#1D1C44] border-[6px] border-[#0A0A26] shadow-[0_12px_0_#0A0A26] active:translate-y-3 active:shadow-none rounded-[40px] font-black text-4xl tracking-tight flex items-center justify-center gap-6 transition-all uppercase italic"
                                >
                                    Start Mission
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
