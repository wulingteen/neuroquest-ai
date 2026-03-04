"use client";
import { useState, useEffect, useCallback } from "react";
import { type LeaderboardEntry } from "@/types/game";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import { getLevelTitle } from "@/lib/game/helpers";
import FomoBird from "@/components/icons/FomoBird";
import BackgroundGraphics from "@/app/news/_components/BackgroundGraphics";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Globe, Plus, X, Search, UserCheck, UserX } from "lucide-react";

type Tab = "all" | "friends";

interface FriendEntry {
    player_id: string;
    username: string | null;
    avatar: string | null;
    xp: number;
    level: number | null;
    streak: number;
}

export default function LeaderboardPage() {
    const { playerName } = useGameStore();

    // ─── All-players leaderboard ───────────────────────────────────────
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingAll, setLoadingAll] = useState(true);

    // ─── Friends leaderboard ───────────────────────────────────────────
    const [friendsBoard, setFriendsBoard] = useState<(LeaderboardEntry & { isMe: boolean })[]>([]);
    const [friendsList, setFriendsList] = useState<FriendEntry[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(true);

    // ─── UI state ─────────────────────────────────────────────────────
    const [tab, setTab] = useState<Tab>("all");
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [addInput, setAddInput] = useState("");
    const [addStatus, setAddStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [addingFriend, setAddingFriend] = useState(false);
    const [removingFriend, setRemovingFriend] = useState<string | null>(null);

    // ─── Data fetching ─────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoadingAll(true);
        try {
            const res = await fetch("/api/leaderboard");
            const result = await res.json();
            if (result.success) setLeaderboard(result.data);
        } catch (e) {
            console.error("Failed to fetch leaderboard:", e);
        } finally {
            setLoadingAll(false);
        }
    }, []);

    const fetchFriends = useCallback(async () => {
        setLoadingFriends(true);
        try {
            const [boardRes, listRes] = await Promise.all([
                fetch("/api/leaderboard/friends"),
                fetch("/api/user/friends"),
            ]);
            const boardData = await boardRes.json();
            const listData = await listRes.json();
            if (boardData.success) setFriendsBoard(boardData.data);
            if (listData.success) setFriendsList(listData.data);
        } catch (e) {
            console.error("Failed to fetch friends data:", e);
        } finally {
            setLoadingFriends(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        fetchFriends();
    }, [fetchAll, fetchFriends]);

    // ─── Add friend ────────────────────────────────────────────────────
    const handleAddFriend = async () => {
        if (!addInput.trim()) return;
        setAddingFriend(true);
        setAddStatus(null);
        try {
            const res = await fetch("/api/user/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: addInput.trim() }),
            });
            const result = await res.json();
            setAddStatus({ type: result.success ? "success" : "error", message: result.message });
            if (result.success) {
                setAddInput("");
                await fetchFriends();
            }
        } catch {
            setAddStatus({ type: "error", message: "Network error. Please try again." });
        } finally {
            setAddingFriend(false);
        }
    };

    // ─── Remove friend ─────────────────────────────────────────────────
    const handleRemoveFriend = async (username: string) => {
        setRemovingFriend(username);
        try {
            await fetch("/api/user/friends", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });
            await fetchFriends();
        } catch (e) {
            console.error("Failed to remove friend:", e);
        } finally {
            setRemovingFriend(null);
        }
    };

    // ─── Render helpers ────────────────────────────────────────────────
    const renderBar = (
        entry: LeaderboardEntry & { isMe?: boolean },
        idx: number,
        maxXP: number,
    ) => {
        const isMe = entry.isMe || entry.name === playerName || entry.name === "YouPlayer";
        const percentage = maxXP > 0 ? (entry.xp / maxXP) * 100 : 0;
        const title = getLevelTitle(entry.level || 1);

        let accentColor = "bg-[#58CC02]";
        if (entry.rank === 1) accentColor = "bg-[#FFD166]";
        else if (entry.rank === 2) accentColor = "bg-[#FEB47B]";
        else if (entry.rank === 3) accentColor = "bg-[#4EEAFF]";
        else if (isMe) accentColor = "bg-[#8B5CF6]";

        return (
            <motion.div
                key={`${entry.rank}-${entry.name}`}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 * idx, type: "spring", stiffness: 100 }}
                className="relative mb-8 mt-4"
            >
                <div className="relative h-16 bg-[#15113B] border-[4px] border-[#0A0A26] rounded-[24px] shadow-[0_8px_0_#0A0A26] flex items-center">
                    {/* Bar Fill */}
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(percentage, 5)}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className={cn("absolute inset-y-0 left-0 rounded-[20px] overflow-hidden", accentColor)}
                    >
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/20 blur-[4px]" />
                    </motion.div>

                    {/* Item Content */}
                    <div className="absolute inset-x-0 inset-y-0 flex items-center justify-between px-5 z-10 pointer-events-none">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#0A0A26]/20 border border-white/10 flex items-center justify-center text-2xl backdrop-blur-sm">
                                {entry.avatar || "🧑"}
                            </div>
                            <div className="flex flex-col">
                                <span className={cn(
                                    "font-black uppercase tracking-tight text-base leading-none mb-0.5",
                                    isMe ? "text-white" : "text-[#0A0A26]",
                                )}>
                                    {entry.name} {isMe && "(YOU)"}
                                </span>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest leading-none",
                                    isMe ? "text-white/60" : "text-[#0A0A26]/60",
                                )}>
                                    {title}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-1">
                            <span className={cn(
                                "text-2xl font-black italic tracking-tighter leading-none",
                                isMe ? "text-white" : "text-[#0A0A26]",
                            )}>
                                {entry.xp.toLocaleString()}
                            </span>
                            <span className={cn(
                                "text-[10px] font-black uppercase opacity-50",
                                isMe ? "text-white/40" : "text-[#0A0A26]/40",
                            )}>XP</span>
                        </div>
                    </div>
                </div>

                {/* Victory Message for Rank 1 */}
                {entry.rank === 1 && entry.victoryMessage && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="absolute -top-12 left-10 z-[100]"
                    >
                        <div className="bg-white text-[#0A0A26] px-5 py-2 rounded-2xl border-[4px] border-[#0A0A26] font-black text-[12px] uppercase shadow-[5px_5px_0px_0px_#0A0A26] flex items-center gap-3 relative">
                            <span className="w-2.5 h-2.5 bg-[#FFD166] rounded-full animate-pulse shadow-[0_0_8px_#FFD166]" />
                            {entry.victoryMessage}
                            <div className="absolute -bottom-3.5 left-6 w-5 h-5 bg-white border-r-[4px] border-b-[4px] border-[#0A0A26] rotate-45 z-[-1]" />
                        </div>
                    </motion.div>
                )}
            </motion.div>
        );
    };

    const loading = tab === "all" ? loadingAll : loadingFriends;

    if (loading && leaderboard.length === 0 && friendsBoard.length === 0) {
        return (
            <div className="min-h-screen bg-[#090812] flex items-center justify-center">
                <div className="animate-bounce">
                    <FomoBird expression="thinking" className="w-20 h-20" />
                </div>
            </div>
        );
    }

    const allMaxXP = leaderboard[0]?.xp || 1;
    const friendsMaxXP = friendsBoard[0]?.xp || 1;

    return (
        <div className="min-h-screen bg-[#090812] text-white font-inter relative pb-32 overflow-x-hidden">
            <BackgroundGraphics />

            <div className="max-w-xl mx-auto px-6 pt-12 relative z-10">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-block mb-4"
                    >
                        <FomoBird expression="happy" className="w-24 h-24 mx-auto" />
                    </motion.div>
                    <h1 className="text-5xl sm:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] drop-shadow-[0_6px_0_#000]">
                        Neural<br />Hierarchy
                    </h1>
                    <div className="mt-4 inline-block bg-[#FF7E5F] border-[3px] border-[#0A0A26] px-5 py-1.5 rounded-full shadow-[0_4px_0_#0A0A26]">
                        <p className="text-white font-black uppercase tracking-[0.2em] text-[10px]">
                            Leaderboard Scanning...
                        </p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-3 mb-8">
                    <button
                        id="tab-all"
                        onClick={() => setTab("all")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] border-[3px] border-[#0A0A26] font-black uppercase text-sm tracking-wide transition-all",
                            tab === "all"
                                ? "bg-[#FFD166] text-[#0A0A26] shadow-[0_5px_0_#0A0A26]"
                                : "bg-[#15113B] text-white/60 shadow-[0_4px_0_#0A0A26] hover:text-white",
                        )}
                    >
                        <Globe className="w-4 h-4" />
                        All Players
                    </button>
                    <button
                        id="tab-friends"
                        onClick={() => setTab("friends")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] border-[3px] border-[#0A0A26] font-black uppercase text-sm tracking-wide transition-all",
                            tab === "friends"
                                ? "bg-[#4EEAFF] text-[#0A0A26] shadow-[0_5px_0_#0A0A26]"
                                : "bg-[#15113B] text-white/60 shadow-[0_4px_0_#0A0A26] hover:text-white",
                        )}
                    >
                        <Users className="w-4 h-4" />
                        Friends
                        {friendsList.length > 0 && (
                            <span className="bg-[#0A0A26] text-white text-[10px] px-1.5 py-0.5 rounded-full font-black ml-1">
                                {friendsList.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ─── ALL TAB ─────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {tab === "all" && (
                        <motion.div
                            key="all"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="space-y-4">
                                {leaderboard.map((entry, idx) =>
                                    renderBar(entry, idx, allMaxXP),
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ─── FRIENDS TAB ──────────────────────────────── */}
                    {tab === "friends" && (
                        <motion.div
                            key="friends"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Add Friend Section */}
                            <div className="mb-8">
                                <div className="bg-[#15113B] border-[4px] border-[#0A0A26] rounded-[24px] shadow-[0_8px_0_#0A0A26] overflow-hidden">
                                    <button
                                        id="btn-add-friend-toggle"
                                        onClick={() => {
                                            setShowAddFriend((v) => !v);
                                            setAddStatus(null);
                                            setAddInput("");
                                        }}
                                        className="w-full flex items-center justify-between px-6 py-4"
                                    >
                                        <span className="flex items-center gap-2 font-black uppercase text-sm tracking-wide text-[#4EEAFF]">
                                            <Plus className="w-4 h-4" />
                                            Add a Friend
                                        </span>
                                        <span className="text-white/30 text-lg">{showAddFriend ? "−" : "+"}</span>
                                    </button>

                                    <AnimatePresence>
                                        {showAddFriend && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden border-t-[4px] border-[#0A0A26]"
                                            >
                                                <div className="px-6 py-4 space-y-3">
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                                            <input
                                                                id="input-friend-username"
                                                                type="text"
                                                                placeholder="Enter username..."
                                                                value={addInput}
                                                                onChange={(e) => setAddInput(e.target.value)}
                                                                onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
                                                                className="w-full bg-[#09080F] border-[3px] border-[#0A0A26] rounded-[14px] pl-9 pr-4 py-2.5 text-white font-bold text-sm placeholder:text-white/20 focus:outline-none focus:border-[#4EEAFF]"
                                                            />
                                                        </div>
                                                        <button
                                                            id="btn-add-friend-submit"
                                                            onClick={handleAddFriend}
                                                            disabled={addingFriend || !addInput.trim()}
                                                            className="flex items-center gap-2 bg-[#4EEAFF] text-[#0A0A26] font-black uppercase text-sm px-4 py-2.5 rounded-[14px] border-[3px] border-[#0A0A26] shadow-[0_4px_0_#0A0A26] disabled:opacity-40 hover:brightness-110 transition-all active:translate-y-1 active:shadow-none"
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                            {addingFriend ? "Adding..." : "Add"}
                                                        </button>
                                                    </div>
                                                    {addStatus && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -4 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className={cn(
                                                                "text-xs font-bold px-4 py-2 rounded-xl border-2",
                                                                addStatus.type === "success"
                                                                    ? "bg-[#58CC02]/10 border-[#58CC02] text-[#58CC02]"
                                                                    : "bg-[#FF4B4B]/10 border-[#FF4B4B] text-[#FF4B4B]",
                                                            )}
                                                        >
                                                            {addStatus.message}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Friends Leaderboard Bars */}
                            {friendsBoard.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-16"
                                >
                                    <FomoBird expression="thinking" className="w-20 h-20 mx-auto mb-4 opacity-40 grayscale" />
                                    <p className="text-white/40 font-bold text-lg">No friends added yet.</p>
                                    <p className="text-white/20 font-bold text-sm mt-1">Add friends to see how you rank!</p>
                                </motion.div>
                            ) : (
                                <div className="space-y-4">
                                    {friendsBoard.map((entry, idx) =>
                                        renderBar(entry, idx, friendsMaxXP),
                                    )}
                                </div>
                            )}

                            {/* Friends Management List */}
                            {friendsList.length > 0 && (
                                <div className="mt-10">
                                    <h2 className="font-black uppercase text-xs tracking-[0.3em] text-white/30 mb-4 px-2">
                                        Your Friends ({friendsList.length})
                                    </h2>
                                    <div className="space-y-2">
                                        {friendsList.map((friend) => (
                                            <motion.div
                                                key={friend.player_id}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                className="flex items-center justify-between bg-[#15113B] border-[3px] border-[#0A0A26] rounded-[18px] px-4 py-3 shadow-[0_4px_0_#0A0A26]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{friend.avatar || "🧑"}</span>
                                                    <div>
                                                        <p className="font-black text-sm text-white uppercase tracking-tight">
                                                            {friend.username}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                                            {getLevelTitle(friend.level || 1)} · {friend.xp.toLocaleString()} XP
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    id={`btn-remove-friend-${friend.username}`}
                                                    onClick={() => friend.username && handleRemoveFriend(friend.username)}
                                                    disabled={removingFriend === (friend.username ?? "")}
                                                    className="flex items-center gap-1.5 bg-[#FF4B4B]/10 text-[#FF4B4B] border-[2px] border-[#FF4B4B]/40 px-3 py-1.5 rounded-[10px] font-black text-[11px] uppercase tracking-wide hover:bg-[#FF4B4B]/20 transition-all disabled:opacity-40"
                                                >
                                                    <UserX className="w-3 h-3" />
                                                    {removingFriend === (friend.username ?? "") ? "..." : "Remove"}
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Insight */}
                <div className="mt-20 bg-[#15113B] border-[4px] border-[#0A0A26] rounded-[48px] p-10 text-center shadow-[0_16px_0_#0A0A26] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#4EEAFF] opacity-5 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <FomoBird expression="thinking" className="w-16 h-16 mx-auto mb-6 opacity-40 grayscale" />
                    <p className="text-[#A5A5D9] font-bold italic text-base leading-relaxed max-w-sm mx-auto">
                        &ldquo;Neural trajectories are converging. Every planetary landing recorded reshapes the hierarchy of the sector.&rdquo;
                    </p>
                </div>
            </div>
        </div>
    );
}
