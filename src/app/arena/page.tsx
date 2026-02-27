"use client";
import { useState, useEffect } from "react";

import { type ArenaChallenge } from "@/types/game";
import { useGameStore } from "@/store/gameStore";
import { Swords, Send, ThumbsUp, Star, Zap, Bot, Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_ENTRIES = [
    {
        player: "NeuralNinja 🥷",
        prompt: "請用一位義大利廚師的語氣，以十四行詩的形式，描述番茄炒蛋的製作過程，每行押韻，並在結尾加入一句感性的哲理。",
        votes: 148,
        aiOutput: "「哦，番茄！你紅如愛情的火焰⋯⋯雞蛋，你白如純潔的初雪⋯⋯當二者在鍋中相遇，便是宇宙間最美麗的碰撞。撒上一撮鹽，如同詩人加上一行省略號——留白，才是藝術最深的表達。」",
    },
    {
        player: "PromptPhysicist ⚛️",
        prompt: "你是一位19世紀浪漫主義詩人，請用充滿情感和比喻的語言，寫一首三節的短詩描述番茄炒蛋，每節四行，用ABAB押韻。",
        votes: 132,
        aiOutput: "金鍋之上，圓日升起，\n蛋白如雲，輕柔絲絲，\n紅珠墜落，似心跌碎，\n此情此景，廚神淚垂。",
    },
    {
        player: "TokenWizard 🧙",
        prompt: "以李白的詩風，用七言絕句描述一道現代料理番茄炒蛋，要求意境深遠，有典故，符合唐詩平仄規律。",
        votes: 87,
        aiOutput: "紅球落盤金液流，白卵相融浪裡頭。\n火候三分鍋氣足，一碗鄉愁解千愁。",
    },
];

export default function ArenaPage() {
    const { addXP } = useGameStore();
    const [selectedChallenge, setSelectedChallenge] = useState(0);
    const [challenges, setChallenges] = useState<ArenaChallenge[]>([]);
    const [myPrompt, setMyPrompt] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [aiOutput, setAiOutput] = useState("");
    const [loading, setLoading] = useState(false);
    const [votedIdx, setVotedIdx] = useState<number | null>(null);
    const [votes, setVotes] = useState(MOCK_ENTRIES.map((e) => e.votes));
    useEffect(() => {
        const fetchChallenges = async () => {
            try {
                const response = await fetch('/api/arena');
                const result = await response.json();
                if (result.success) {
                    setChallenges(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch challenges:", error);
            }
        };
        fetchChallenges();
    }, []);

    const challenge = challenges[selectedChallenge];

    const handleSubmit = async () => {
        if (!myPrompt.trim()) return;
        setLoading(true);
        await new Promise((r) => setTimeout(r, 2000));
        // Simulate AI output
        setAiOutput(
            `根據你的 Prompt：「${myPrompt.slice(0, 40)}...」\n\nAI 生成：番茄紅似靦腆少女的臉龐，雞蛋則是她純真無瑕的心；當烈火相遇，便誕生了這道平凡卻深情的料理。鍋鏟聲聲，是廚師寫給歲月的情書。`
        );
        setLoading(false);
        setSubmitted(true);
        addXP(100);
    };

    const handleVote = (idx: number) => {
        if (votedIdx !== null) return;
        setVotedIdx(idx);
        setVotes((v) => v.map((x, i) => (i === idx ? x + 1 : x)));
        addXP(25);
    };

    return (
        <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center neon-glow-purple">
                        <Swords className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black gradient-text" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            PROMPT ARENA
                        </h1>
                        <p className="text-slate-400 text-sm">用 Prompt 決勝負，讓 AI 為你發聲</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-3 mt-4 flex-wrap">
                    <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span className="text-slate-300">1,247 人正在競技</span>
                    </div>
                    <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-slate-300">本週結算：2天 14小時後</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Challenge + My submission */}
                <div className="space-y-4">
                    {/* Challenge selector */}
                    <div className="glass-card p-5">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">本週挑戰</p>
                        <div className="space-y-2 mb-4">
                            {challenges.map((c, i) => (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelectedChallenge(i); setSubmitted(false); setMyPrompt(""); setAiOutput(""); }}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl border text-sm",
                                        selectedChallenge === i
                                            ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                                            : "border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">{c.title}</span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full",
                                            c.difficulty === "easy" ? "bg-green-500/20 text-green-400" :
                                                c.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                                    "bg-red-500/20 text-red-400"
                                        )}>
                                            {c.difficulty === "easy" ? "簡單" : c.difficulty === "medium" ? "中等" : "困難"}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-xs mt-1 line-clamp-1">{c.description}</p>
                                </button>
                            ))}
                        </div>

                        {/* Challenge detail */}
                        {challenge && (
                            <div className="glass-card p-4 border border-purple-500/20 bg-purple-500/5">
                                <div className="flex items-start gap-2">
                                    <Bot className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-white mb-1">{challenge.title}</p>
                                        <p className="text-xs text-slate-400">{challenge.description}</p>
                                        <div className="flex gap-1 flex-wrap mt-2">
                                            {challenge.examples.map((ex: string) => (
                                                <span key={ex} className="text-xs bg-white/5 text-slate-500 px-2 py-0.5 rounded-full">{ex}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* My Prompt Input */}
                    <div className="glass-card p-5">
                        <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            設計你的 Prompt
                        </p>
                        <textarea
                            value={myPrompt}
                            onChange={(e) => setMyPrompt(e.target.value)}
                            disabled={submitted}
                            placeholder="輸入你的 Prompt... 發揮創意，讓 AI 展現最佳表現！"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 resize-none h-28 focus:outline-none focus:border-purple-500/50"
                        />
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-slate-500">{myPrompt.length} 字元</span>
                            {!submitted ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!myPrompt.trim() || loading}
                                    className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <span>⚛️</span>
                                    ) : <Send className="w-4 h-4" />}
                                    {loading ? "AI 生成中..." : "提交 Prompt"}
                                </button>
                            ) : (
                                <span className="text-xs text-green-400 flex items-center gap-1">✓ 已提交 · +100 XP</span>
                            )}
                        </div>

                        {/* AI Output */}
                        {aiOutput && (
                            <div className="mt-4 glass-card p-4 border border-cyan-500/20 bg-cyan-500/5">
                                <p className="text-xs text-cyan-400 mb-2 flex items-center gap-1">
                                    <Bot className="w-3 h-3" /> AI 生成結果
                                </p>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap">{aiOutput}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Leaderboard of this week's prompts */}
                <div className="glass-card p-5">
                    <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        本週熱門 Prompt
                        <span className="ml-auto text-xs text-slate-500">投票支持你喜愛的！</span>
                    </p>

                    <div className="space-y-4">
                        {MOCK_ENTRIES.map((entry, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "glass-card p-4 border",
                                    idx === 0 ? "border-yellow-500/30 bg-yellow-500/5" :
                                        idx === 1 ? "border-slate-400/20" :
                                            "border-white/5"
                                )}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">
                                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                                        </span>
                                        <span className="text-sm font-bold text-white">{entry.player}</span>
                                    </div>
                                    <button
                                        onClick={() => handleVote(idx)}
                                        className={cn(
                                            "flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border",
                                            votedIdx === idx
                                                ? "border-purple-500/50 bg-purple-500/20 text-purple-300"
                                                : votedIdx !== null
                                                    ? "border-white/5 text-slate-600 cursor-not-allowed"
                                                    : "border-white/10 text-slate-400 hover:border-purple-500/30 hover:text-purple-300"
                                        )}
                                    >
                                        <ThumbsUp className="w-3 h-3" />
                                        <span>{votes[idx]}</span>
                                    </button>
                                </div>

                                <div className="bg-white/5 rounded-lg p-3 mb-2">
                                    <p className="text-xs text-slate-500 mb-1">Prompt:</p>
                                    <p className="text-xs text-slate-300 line-clamp-2">{entry.prompt}</p>
                                </div>

                                <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-3">
                                    <p className="text-xs text-cyan-400 mb-1">AI 輸出:</p>
                                    <p className="text-xs text-slate-300 line-clamp-3">{entry.aiOutput}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 glass-card p-3 border border-yellow-500/20 bg-yellow-500/5">
                        <p className="text-xs text-yellow-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            投票可得 25 XP · 你的 Prompt 被投票可再得 10 XP
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
