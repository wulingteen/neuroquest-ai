"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Sparkles,
    Loader2,
    Check,
    ArrowRight,
    Compass,
    Target,
    ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreToTier } from "@/lib/game";
import { type ProfileOption } from "@/types/game";

/**
 * REDESIGNED PROFILE SETUP
 * Focusing on "Only English" and "Subtraction" Principle.
 * One clear step at a time.
 */

interface ProfileSetupModalProps {
    open: boolean;
    onComplete: (score: number) => void;
}

type SetupStep = "backgrounds" | "sectors" | "calibration";

export default function ProfileSetupModal({
    open,
    onComplete,
}: ProfileSetupModalProps) {
    const [step, setStep] = useState<SetupStep>("backgrounds");
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
                setError("System link failure. Unable to retrieve operative profiles.");
            } finally {
                setLoading(false);
            }
        })();
    }, [open]);

    const handleBgClick = (key: string) => {
        setSelectedBg(key);
        // Clean snap to next step
        setTimeout(() => setStep("sectors"), 350);
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
            setError("Critical calibration failure. Try again.");
            setSubmitting(false);
        }
    };

    const RANK_MAP: Record<number, { label: string; color: string }> = {
        1: { label: "NOVICE", color: "#58cc02" },
        2: { label: "BASIC", color: "#1cb0f6" },
        3: { label: "ADEPT", color: "#ce82ff" },
        4: { label: "EXPERT", color: "#ff9600" },
        5: { label: "MASTER", color: "#ea2b2b" },
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
                className="fixed inset-0 z-[60] flex flex-col bg-[#02040a] text-white font-['Inter'] overflow-hidden"
            >
                {/* Visual Background */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(28,176,246,0.1),transparent_70%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:100px_100px]" />
                </div>

                {/* Progress Node */}
                <div className="w-full flex justify-center py-10 px-8 relative z-10 shrink-0">
                    <div className="w-full max-w-5xl flex gap-3 h-1">
                        {step !== "calibration" && (
                            <>
                                <div className={cn("flex-1 rounded-full transition-all duration-700", (step === "backgrounds" || step === "sectors") ? "bg-[#1cb0f6]" : "bg-white/5")} />
                                <div className={cn("flex-1 rounded-full transition-all duration-700", step === "sectors" ? "bg-[#1cb0f6]" : "bg-white/5")} />
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-32 relative z-10 flex flex-col">
                    <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center min-h-0">
                        {loading ? (
                            <div className="flex flex-col items-center gap-8 animate-pulse">
                                <Loader2 className="w-20 h-20 text-[#1cb0f6] animate-spin" />
                                <p className="text-gray-500 font-black tracking-[0.5em] text-sm uppercase">Accessing Filesystems...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center space-y-8 max-w-md mx-auto">
                                <ShieldAlert className="w-24 h-24 text-red-500 mx-auto opacity-50" />
                                <h2 className="text-5xl font-black tracking-tighter">ACCESS DENIED</h2>
                                <p className="text-gray-500 font-bold text-lg leading-relaxed">{error}</p>
                                <button onClick={() => window.location.reload()} className="w-full py-5 bg-white text-black font-black rounded-3xl">RETRY ACCESS</button>
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                {step === "backgrounds" && (
                                    <motion.div
                                        key="step-bg"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.05 }}
                                        className="space-y-16"
                                    >
                                        <div className="text-center space-y-4">
                                            <Compass className="w-16 h-16 text-[#1cb0f6] mx-auto opacity-40" />
                                            <h2 className="text-7xl font-black tracking-tighter leading-none">Identify Your Profile</h2>
                                            <p className="text-gray-500 font-black tracking-widest text-xs uppercase">Select your operative expertise level.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {bgOptions.map((opt) => (
                                                <button
                                                    key={opt.key}
                                                    onClick={() => handleBgClick(opt.key)}
                                                    className={cn(
                                                        "group p-10 rounded-[48px] border-2 transition-all flex flex-col items-center gap-8 relative overflow-hidden h-full",
                                                        selectedBg === opt.key
                                                            ? "bg-[#1cb0f6] border-[#1cb0f6] text-white shadow-[0_0_50px_rgba(28,176,246,0.3)] scale-105"
                                                            : "bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10"
                                                    )}
                                                >
                                                    <span className="text-7xl group-hover:scale-110 transition-transform">{opt.icon}</span>
                                                    <span className="font-black text-2xl tracking-tighter uppercase">{opt.label}</span>
                                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {step === "sectors" && (
                                    <motion.div
                                        key="step-sectors"
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-16"
                                    >
                                        <div className="text-center space-y-4">
                                            <Target className="w-16 h-16 text-[#1cb0f6] mx-auto opacity-40" />
                                            <h2 className="text-7xl font-black tracking-tighter leading-none">Clearance Focus</h2>
                                            <p className="text-gray-500 font-black tracking-widest text-xs uppercase">Sector targeting required (Multiple selection enabled).</p>
                                        </div>

                                        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
                                            {sectorOptions.map((opt) => {
                                                const isActive = selectedSectors.has(opt.key);
                                                return (
                                                    <button
                                                        key={opt.key}
                                                        onClick={() => toggleSector(opt.key)}
                                                        className={cn(
                                                            "px-10 py-6 rounded-full border-2 font-black text-xl transition-all flex items-center gap-4",
                                                            isActive
                                                                ? "bg-[#1cb0f6] border-[#1cb0f6] text-white shadow-[0_0_30px_rgba(28,176,246,0.2)]"
                                                                : "bg-white/5 border-white/5 text-gray-500 hover:text-white"
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
                                        className="text-center space-y-16 py-12"
                                    >
                                        <div className="space-y-4">
                                            <h2 className="text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-600 bg-clip-text text-transparent">Calibration Hit</h2>
                                            <p className="text-[#1cb0f6] font-black tracking-[0.6em] text-xs uppercase">Operative index verified</p>
                                        </div>

                                        <div className="inline-block p-20 rounded-[80px] border-2 border-dashed border-white/10 bg-white/5 relative">
                                            <div className="absolute inset-0 bg-[#1cb0f6]/5 blur-[120px]" />
                                            <div className="text-[12rem] font-black tracking-tighter leading-none relative z-10" style={{ color: getRank(finalScore).color }}>
                                                {finalScore}
                                            </div>
                                            <div className="text-4xl font-black tracking-widest uppercase mt-4 text-white relative z-10 flex items-center justify-center gap-4">
                                                {getRank(finalScore).label} <Sparkles className="w-10 h-10" />
                                            </div>
                                        </div>

                                        <p className="max-w-md mx-auto text-xl text-gray-500 font-medium leading-relaxed">
                                            Global Mission Radar has been calibrated to Tier {getRank(finalScore).tier}. You are ready for deployment.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* Simplified Sticky Actions */}
                {!loading && !error && (step === "sectors" || step === "calibration") && (
                    <div className="fixed bottom-0 left-0 right-0 p-12 flex justify-center bg-gradient-to-t from-[#02040a] via-[#02040a] to-transparent relative z-20">
                        <div className="w-full max-w-5xl flex gap-6">
                            {step === "sectors" && (
                                <>
                                    <button onClick={() => setStep("backgrounds")} className="px-12 py-8 bg-white/5 hover:bg-white/10 rounded-[32px] font-black tracking-widest text-sm uppercase transition-all">Back</button>
                                    <button
                                        disabled={selectedSectors.size === 0 || submitting}
                                        onClick={runCalibration}
                                        className="flex-1 bg-[#58cc02] hover:bg-[#46a302] border-b-[12px] border-[#3d8c11] active:border-b-0 active:translate-y-2 rounded-[40px] font-black text-3xl tracking-widest flex items-center justify-center gap-6 transition-all shadow-[0_0_60px_rgba(88,204,2,0.3)] disabled:opacity-30 disabled:pointer-events-none"
                                    >
                                        {submitting ? <Loader2 className="w-10 h-10 animate-spin" /> : <>RUN CALIBRATION <ArrowRight /></>}
                                    </button>
                                </>
                            )}
                            {step === "calibration" && (
                                <button
                                    onClick={() => onComplete(finalScore!)}
                                    className="w-full py-10 bg-[#1cb0f6] hover:bg-[#1498d5] border-b-[16px] border-[#1899d6] active:border-b-0 active:translate-y-3 rounded-[56px] font-black text-5xl tracking-tighter flex items-center justify-center gap-6 transition-all shadow-[0_0_100px_rgba(28,176,246,0.4)]"
                                >
                                    ENTER INTELLIGENCE HUB
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
