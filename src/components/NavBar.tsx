"use client";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { Zap, Trophy, Flame, Star, Brain, Swords, Map, Newspaper } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { href: "/", label: "Map", icon: Map },
    { href: "/arena", label: "Arena", icon: Swords },
    { href: "/leaderboard", label: "Ranking", icon: Trophy },
    { href: "/lab", label: "Lab", icon: Brain },
];

export default function NavBar() {
    const { xp, level, levelProgress, streak, playerAvatar } = useGameStore();
    const pathname = usePathname();

    return (
        <motion.nav
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-b border-white/10"
            style={{ borderRadius: 0 }}
        >
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-lg animate-glow-pulse">
                        ⚛️
                    </div>
                    <div className="hidden sm:block">
                        <p className="font-bold text-sm gradient-text" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            NEUROQUEST AI
                        </p>
                    </div>
                </Link>

                {/* Nav Items */}
                <div className="hidden md:flex items-center gap-1">
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                pathname === href
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </Link>
                    ))}
                </div>

                {/* Player Info */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Streak */}
                    <div className="hidden sm:flex items-center gap-1.5 glass-card px-3 py-1.5 text-sm">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="font-bold text-orange-300">{streak}</span>
                    </div>

                    {/* XP & Level */}
                    <div className="hidden sm:flex flex-col items-end gap-0.5 min-w-[100px]">
                        <div className="flex items-center gap-2 w-full">
                            <div className="flex items-center gap-1 text-xs">
                                <Zap className="w-3 h-3 text-yellow-400" />
                                <span className="text-yellow-300 font-bold">{xp.toLocaleString()} XP</span>
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                                <Star className="w-3 h-3 text-purple-400" />
                                <span className="text-purple-300 text-xs font-bold">Lv.{level}</span>
                            </div>
                        </div>
                        <div className="xp-bar-track w-full">
                            <div
                                className="xp-bar-fill"
                                style={{ width: `${levelProgress}%` }}
                            />
                        </div>
                    </div>

                    {/* Avatar */}
                    <Link href="/lab">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-lg cursor-pointer hover:scale-110 transition-transform neon-glow-purple">
                            {playerAvatar}
                        </div>
                    </Link>
                </div>
            </div>

            {/* Mobile Nav */}
            <div className="md:hidden flex border-t border-white/5">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-all",
                            pathname === href
                                ? "text-purple-300"
                                : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                    </Link>
                ))}
            </div>
        </motion.nav>
    );
}
