"use client";
import { useState, useEffect, useCallback } from "react";
import { type LeaderboardEntry } from "@/types/game";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import { getLevelTitle } from "@/lib/game/helpers";
import FomoBird from "@/components/icons/FomoBird";
import BackgroundGraphics from "@/app/news/_components/BackgroundGraphics";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Globe, Plus, X, Search, UserCheck } from "lucide-react";

type Tab = "all" | "friends";

interface FriendEntry {
    player_id: string;
    username: string | null;
    avatar: string | null;
    xp: number;
    level: number | null;
    streak: number;
}

interface FriendRequestEntry {
    request_id: string;
    requester_id: string;
    requester_username: string | null;
    requester_avatar: string | null;
    created_at: string;
}

export default function LeaderboardPage() {
    const { playerName } = useGameStore();

    // ─── All-players leaderboard ───────────────────────────────────────
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingAll, setLoadingAll] = useState(true);

    // ─── Friends leaderboard ───────────────────────────────────────────
    const [friendsBoard, setFriendsBoard] = useState<(LeaderboardEntry & { isMe: boolean })[]>([]);
    const [friendsList, setFriendsList] = useState<FriendEntry[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequestEntry[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(true);

    // ─── UI state ─────────────────────────────────────────────────────
    const [tab, setTab] = useState<Tab>("all");
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [addInput, setAddInput] = useState("");
    const [addStatus, setAddStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [addingFriend, setAddingFriend] = useState(false);
    const [handlingRequest, setHandlingRequest] = useState<string | null>(null);

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
            const [boardRes, listRes, requestsRes] = await Promise.all([
                fetch("/api/leaderboard/friends"),
                fetch("/api/user/friends"),
                fetch("/api/user/friends/requests"),
            ]);
            const boardData = await boardRes.json();
            const listData = await listRes.json();
            const requestsData = await requestsRes.json();
            if (boardData.success) setFriendsBoard(boardData.data);
            if (listData.success) setFriendsList(listData.data);
            if (requestsData.success) setPendingRequests(requestsData.data);
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

    // ─── Send friend request ───────────────────────────────────────────
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


    // ─── Handle friend request (accept / decline) ──────────────────────
    const handleFriendRequest = async (requestId: string, action: "accept" | "decline") => {
        setHandlingRequest(requestId);
        try {
            await fetch("/api/user/friends/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ request_id: requestId, action }),
            });
            await fetchFriends();
        } catch (e) {
            console.error("Failed to handle friend request:", e);
        } finally {
            setHandlingRequest(null);
        }
    };

    // ─── Close modal helper ────────────────────────────────────────────
    const closeAddFriendModal = () => {
        setShowAddFriend(false);
        setAddStatus(null);
        setAddInput("");
    };

    // ─── Render helpers ────────────────────────────────────────────────
    const renderBar = (
        entry: LeaderboardEntry & { isMe?: boolean },
        idx: number,
        maxXP: number,
    ) => {
        const isMe = entry.isMe || entry.name === playerName || entry.name === "YouPlayer";
        const percentage = maxXP > 0 ? (entry.xp / maxXP) * 100 : 0;
        const barWidth = Math.max(percentage, 5);
        const title = getLevelTitle(entry.level || 1);

        let accentColor = "bg-[#58CC02]";
        if (entry.rank === 1) accentColor = "bg-[#FFD166]";
        else if (entry.rank === 2) accentColor = "bg-[#FEB47B]";
        else if (entry.rank === 3) accentColor = "bg-[#4EEAFF]";
        else if (isMe) accentColor = "bg-[#8B5CF6]";

        const renderBarContent = (isOnBar: boolean) => {
            const isLightBar = accentColor !== "bg-[#8B5CF6]";
            const useDark = isOnBar && isLightBar;
            return (
                <div
                    className="absolute inset-x-0 inset-y-0 flex items-center justify-between px-5 z-10 pointer-events-none"
                    aria-hidden={isOnBar ? "true" : "false"}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#0A0A26]/20 border border-white/10 flex items-center justify-center text-2xl backdrop-blur-sm">
                            {entry.avatar || "🧑"}
                        </div>
                        <div className="flex flex-col">
                            <span className={cn(
                                "font-black tracking-tight text-base leading-none mb-0.5",
                                useDark ? "text-[#0A0A26]" : "text-white",
                            )}>
                                {entry.name} {isMe && "(YOU)"}
                            </span>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest leading-none",
                                useDark ? "text-[#0A0A26]/60" : "text-white/60",
                            )}>
                                {title}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-1">
                        <span className={cn(
                            "text-2xl font-black italic tracking-tighter leading-none",
                            useDark ? "text-[#0A0A26]" : "text-white",
                        )}>
                            {entry.xp.toLocaleString()}
                        </span>
                        <span className={cn(
                            "text-[10px] font-black uppercase",
                            useDark ? "text-[#0A0A26]/40" : "text-white/40",
                        )}>XP</span>
                    </div>
                </div>
            );
        };

        return (
            <motion.div
                key={`${entry.rank}-${entry.name}`}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 * idx, type: "spring", stiffness: 100 }}
                className="relative mb-8 mt-4"
            >
                <div className="relative h-16 bg-[#15113B] border-[4px] border-[#0A0A26] rounded-[24px] shadow-[0_8px_0_#0A0A26] flex items-center overflow-hidden">
                    {/* Layer 1: Underlay (White text on dark bg) */}
                    {renderBarContent(false)}

                    {/* Layer 2: Bar Background (Moves with width) */}
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className={cn("absolute inset-y-0 left-0 rounded-[20px] overflow-hidden", accentColor)}
                    >
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/20 blur-[4px]" />
                    </motion.div>

                    {/* Layer 3: Overlay (Dark text, clipped to bar width) */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ clipPath: "inset(0 100% 0 0)" }}
                        animate={{ clipPath: `inset(0 ${100 - barWidth}% 0 0)` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        style={{ zIndex: 15 }}
                    >
                        {renderBarContent(true)}
                    </motion.div>
                </div>

                {/* Victory Message for Rank 1 */}
                {entry.rank === 1 && entry.victoryMessage && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="absolute -top-12 left-10 z-[100]"
                    >
                        <div className="bg-white text-[#0A0A26] px-5 py-2 rounded-2xl border-[4px] border-[#0A0A26] font-black text-[12px] shadow-[5px_5px_0px_0px_#0A0A26] flex items-center gap-3 relative">
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
                        {pendingRequests.length > 0 && (
                            <span className="bg-[#FF7E5F] text-white text-[10px] px-1.5 py-0.5 rounded-full font-black ml-1 animate-pulse">
                                {pendingRequests.length}
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


                            {/* ─── Pending Friend Requests Inbox ─────── */}
                            {pendingRequests.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-10"
                                >
                                    <h2 className="font-black uppercase text-xs tracking-[0.3em] text-[#FFE100] mb-4 px-2">
                                        Friend Requests ({pendingRequests.length})
                                    </h2>
                                    <div className="space-y-2">
                                        {pendingRequests.map((req) => (
                                            <motion.div
                                                key={req.request_id}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                className="flex items-center justify-between bg-[#1D1C44] border-[4px] border-[#0A0A26] rounded-[18px] px-5 py-3 shadow-[0_5px_0_#0A0A26]"
                                            >
                                                <p className="font-black text-sm text-white tracking-tight">
                                                    {req.requester_username}
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        id={`btn-decline-request-${req.request_id}`}
                                                        onClick={() => handleFriendRequest(req.request_id, "decline")}
                                                        disabled={handlingRequest === req.request_id}
                                                        className="bg-[#FF4B4B]/15 text-[#FF4B4B] border-[2px] border-[#FF4B4B]/50 px-3 py-1.5 rounded-[10px] font-black text-[11px] uppercase tracking-wide hover:bg-[#FF4B4B]/30 transition-all disabled:opacity-40"
                                                    >
                                                        {handlingRequest === req.request_id ? "..." : "Decline"}
                                                    </button>
                                                    <button
                                                        id={`btn-accept-request-${req.request_id}`}
                                                        onClick={() => handleFriendRequest(req.request_id, "accept")}
                                                        disabled={handlingRequest === req.request_id}
                                                        className="bg-[#FFE100] text-[#0A0A26] border-[2px] border-[#0A0A26] px-4 py-1.5 rounded-[10px] font-black text-[11px] uppercase tracking-wide hover:brightness-110 shadow-[0_3px_0_#0A0A26] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40"
                                                    >
                                                        {handlingRequest === req.request_id ? "..." : "Accept"}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Add Friend Button — bottom of friends list */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-10 mb-4"
                            >
                                <button
                                    id="btn-add-friend-toggle"
                                    onClick={() => {
                                        setShowAddFriend(true);
                                        setAddStatus(null);
                                        setAddInput("");
                                    }}
                                    className="w-full flex items-center justify-center gap-2.5 bg-[#4EEAFF] text-[#0A0A26] font-black uppercase text-sm tracking-widest px-8 py-4 rounded-[20px] border-[4px] border-[#0A0A26] shadow-[0_6px_0_#0A0A26] hover:brightness-110 transition-all active:translate-y-1.5 active:shadow-[0_2px_0_#0A0A26]"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add a Friend
                                </button>
                            </motion.div>
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

            {/* ─── Add Friend Modal ─────────────────────────────────────────── */}
            <AnimatePresence>
                {showAddFriend && (
                    <motion.div
                        key="add-friend-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
                        onClick={closeAddFriendModal}
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

                        {/* Modal Card */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            transition={{ type: "spring", stiffness: 280, damping: 24 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-sm bg-[#1D1C44] border-[4px] border-[#0A0A26] rounded-[28px] shadow-[0_12px_0_#0A0A26] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b-[4px] border-[#0A0A26]">
                                <h2 className="font-black uppercase text-sm tracking-[0.2em] text-[#FFE100]">
                                    Add a Friend
                                </h2>
                                <button
                                    id="btn-close-add-friend-modal"
                                    onClick={closeAddFriendModal}
                                    className="w-8 h-8 rounded-[10px] bg-[#0A0A26]/60 border-[2px] border-[#0A0A26] flex items-center justify-center text-white/50 hover:text-white hover:bg-[#0A0A26] transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="px-6 py-6 space-y-4">
                                <p className="text-white/40 font-bold text-xs uppercase tracking-widest">
                                    Enter their username — they&apos;ll need to accept
                                </p>

                                {/* Input */}
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        id="input-friend-username"
                                        type="text"
                                        placeholder="Username..."
                                        value={addInput}
                                        onChange={(e) => setAddInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
                                        autoFocus
                                        className="w-full bg-[#090812] border-[4px] border-[#0A0A26] rounded-[16px] pl-10 pr-4 py-3.5 text-white font-bold text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FFE100] transition-colors shadow-[inset_0_2px_0_rgba(0,0,0,0.4)]"
                                    />
                                </div>

                                {/* Send Button — full width */}
                                <button
                                    id="btn-add-friend-submit"
                                    onClick={handleAddFriend}
                                    disabled={addingFriend || !addInput.trim()}
                                    className="w-full flex items-center justify-center gap-2 bg-[#FFE100] text-[#0A0A26] font-black uppercase text-sm tracking-widest py-4 rounded-[16px] border-[4px] border-[#0A0A26] shadow-[0_5px_0_#0A0A26] hover:brightness-105 transition-all active:translate-y-1 active:shadow-[0_2px_0_#0A0A26] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <UserCheck className="w-4 h-4" />
                                    {addingFriend ? "Sending..." : "Send Request"}
                                </button>

                                <AnimatePresence>
                                    {addStatus && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            className={cn(
                                                "text-xs font-bold px-4 py-3 rounded-[14px] border-[3px]",
                                                addStatus.type === "success"
                                                    ? "bg-[#58CC02]/10 border-[#58CC02] text-[#58CC02]"
                                                    : "bg-[#FF4B4B]/10 border-[#FF4B4B] text-[#FF4B4B]",
                                            )}
                                        >
                                            {addStatus.message}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
