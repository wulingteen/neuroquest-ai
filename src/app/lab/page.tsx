"use client";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { Zap, Flame, ChevronRight } from "lucide-react";
import Profile3D from "./_components/Profile3D";

export default function LabPage() {
    const { xp, level, streak, playerAvatar, levelTitle, levelProgress } = useGameStore();

    return (
        <div className="min-h-screen bg-[#1F2024] text-white flex flex-col font-sans pb-24 overflow-x-hidden">
            {/* Top Bar */}
            <div className="flex justify-between items-center px-5 pt-8 pb-4 relative z-10 w-full max-w-md mx-auto xl:max-w-xl">
                <div className="flex items-center gap-1.5 cursor-pointer">
                    <div className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-[11px] text-[#1F2024] font-black">
                        {playerAvatar || "M"}
                    </div>
                    <span className="font-bold text-xl">{xp}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="font-medium">Lv.{level} <span className="mx-2 text-slate-500">|</span> {levelTitle}</span>
                </div>
            </div>

            {/* Main Visual Element (3D Profile Placeholder) */}
            <div className="relative w-full h-[380px] xl:h-[450px] flex items-center justify-center overflow-hidden shrink-0 mt-[-70px]">
                {/* Background environment styling for the 3D area */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#1F2024] via-[#242631] to-[#122A1E] opacity-90" />

                {/* Ground */}
                <div className="absolute bottom-0 w-[180%] ml-[-40%] h-[150px] bg-gradient-to-t from-[#2E8A42] to-[#204A2C] rounded-[100%] blur-[2px]" />

                {/* The Canvas for 3D Profile */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pt-20 pb-4">
                    <Profile3D />
                </div>
            </div>

            {/* Controls & Stats Area */}
            <div className="flex-1 w-full max-w-md xl:max-w-xl mx-auto px-5 relative z-20 flex flex-col gap-8 -mt-8">

                {/* Floating Buttons */}
                <div className="flex gap-4">
                    {/* Big Green Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 bg-[#25D366] text-white rounded-[22px] py-[18px] flex items-center justify-center font-bold text-2xl shadow-[0_5px_0_#1DA851] hover:bg-[#20BC5A] transition-colors"
                    >
                        <Zap className="w-6 h-6 mr-1" fill="currentColor" strokeWidth={0} />
                        {xp % 100}
                    </motion.button>
                    {/* Small Red Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-[90px] bg-[#FF4F4F] text-white rounded-[22px] py-[18px] flex items-center justify-center shadow-[0_5px_0_#CC3D3D] hover:bg-[#E64646] transition-colors shrink-0"
                    >
                        <Flame className="w-7 h-7" fill="currentColor" strokeWidth={0} />
                    </motion.button>
                </div>

                {/* List Group: "Today's Move" */}
                <div>
                    <h3 className="text-lg font-bold mb-3 text-white tracking-wide">Today's Move</h3>

                    <div className="flex flex-col">
                        {/* Item 1: Level Progress (Replacing Steps) */}
                        <div className="flex items-center justify-between py-4 group cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="text-[#25D366]">
                                    <Zap className="w-6 h-6" fill="currentColor" />
                                </div>
                                <span className="text-[17px] text-white/90 font-medium">948 XP Steps</span>
                            </div>
                            <div className="flex items-center gap-2 font-bold text-[#25D366]">
                                <Zap className="w-3.5 h-3.5" fill="currentColor" /> 9 <ChevronRight className="w-4 h-4 text-slate-500" />
                            </div>
                        </div>
                        {/* A progress bar under the item */}
                        <div className="h-[3px] w-full bg-[#30323A] rounded-full overflow-hidden mt-[-2px]">
                            <div className="h-full bg-[#25D366] rounded-full" style={{ width: `${levelProgress}%` }}></div>
                        </div>

                        {/* Item 2: Streak (Replacing Distance) */}
                        <div className="flex items-center justify-between py-4 border-b border-[#30323A] group cursor-pointer mt-1">
                            <div className="flex items-center gap-3">
                                <div className="text-[#25D366]">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                                </div>
                                <span className="text-[17px] text-white/90 font-medium">{streak} Focus Mins</span>
                            </div>
                            <div className="flex items-center gap-2 font-bold text-[#25D366]">
                                <Zap className="w-3.5 h-3.5" fill="currentColor" /> 0 <ChevronRight className="w-4 h-4 text-slate-500" />
                            </div>
                        </div>

                        {/* Item 3: Extras (Replacing Cheer Friends) */}
                        <div className="flex items-center justify-between py-4 border-b border-[#30323A] group cursor-pointer mt-1">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">👏</span>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <span className="text-[17px] text-white/90 font-medium tracking-tight">Cheer for friends to get extra mileage</span>
                                    <span className="bg-[#2A2B31] border border-[#40424A] text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full inline-flex w-fit h-fit items-center justify-center">Beta</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🎁</span> <ChevronRight className="w-4 h-4 text-slate-500" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
