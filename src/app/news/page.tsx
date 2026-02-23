"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { Newspaper, ExternalLink, Zap, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const NEWS_ITEMS = [
    {
        id: "n1",
        title: "GPT-5 正式發布：多模態理解大幅提升，程式生成準確率達 92%",
        summary: "OpenAI 宣布 GPT-5 正式上線，在程式生成、數學推理和多步驟任務方面有顯著突破，支援 100 萬 Token 上下文窗口。",
        date: "2026-02-22",
        source: "OpenAI Blog",
        category: "模型更新",
        categoryColor: "#8B5CF6",
        reward: 75,
        quiz: {
            q: "GPT-5 在哪個任務上有特別顯著的突破？",
            options: ["圖像生成", "語音識別", "程式生成與數學推理", "影片剪輯"],
            correct: 2,
        },
        read: false,
    },
    {
        id: "n2",
        title: "Google Gemini Ultra 2.0 推出：首個在科學基準超越人類的 AI",
        summary: "Google DeepMind 的 Gemini Ultra 2.0 在生物、化學、物理等科學基準測試中首次全面超越人類專家表現，引發 AI 社群廣泛討論。",
        date: "2026-02-20",
        source: "Google DeepMind",
        category: "研究突破",
        categoryColor: "#10B981",
        reward: 100,
        quiz: {
            q: "Gemini Ultra 2.0 的主要突破是什麼？",
            options: ["最快的推理速度", "在科學基準超越人類專家", "最低廉的使用成本", "最大的訓練資料集"],
            correct: 1,
        },
        read: false,
    },
    {
        id: "n3",
        title: "Anthropic Claude 3.7 發布：首個支援長達 24 小時自主工作的 AI Agent",
        summary: "Anthropic 的 Claude 3.7 引入全新 Extended Thinking 模式，可支援複雜任務連續工作超過 24 小時而不失去上下文一致性。",
        date: "2026-02-18",
        source: "Anthropic",
        category: "AI Agent",
        categoryColor: "#F97316",
        reward: 90,
        quiz: {
            q: "Claude 3.7 的 Extended Thinking 模式有什麼特點？",
            options: ["更快的回應速度", "更便宜的價格", "支援超長時間自主工作", "支援圖像生成"],
            correct: 2,
        },
        read: false,
    },
    {
        id: "n4",
        title: "AI 監管新法案：歐盟 AI Act 正式生效，高風險應用需強制審計",
        summary: "歐盟 AI Act 進入全面執行階段，企業部署高風險 AI 系統前需通過第三方審計，違規最高罰款達年營收的 7%。",
        date: "2026-02-15",
        source: "EU Official",
        category: "AI 倫理法規",
        categoryColor: "#EF4444",
        reward: 80,
        quiz: {
            q: "歐盟 AI Act 對高風險 AI 系統的要求是什麼？",
            options: ["禁止使用", "強制公開原始碼", "需要第三方審計", "必須使用歐洲伺服器"],
            correct: 2,
        },
        read: false,
    },
];

export default function NewsPage() {
    const { addXP } = useGameStore();
    const [readItems, setReadItems] = useState<Set<string>>(new Set());
    const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
    const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
    const [quizAnswered, setQuizAnswered] = useState(false);

    const handleRead = (id: string) => {
        if (!readItems.has(id)) {
            setReadItems((prev) => new Set([...prev, id]));
        }
        setActiveQuiz(id);
        setQuizAnswer(null);
        setQuizAnswered(false);
    };

    const handleQuizAnswer = (newsId: string, idx: number) => {
        if (quizAnswered) return;
        const news = NEWS_ITEMS.find((n) => n.id === newsId);
        if (!news) return;
        setQuizAnswer(idx);
        setQuizAnswered(true);
        if (idx === news.quiz.correct) {
            addXP(news.reward);
        }
    };

    return (
        <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black gradient-text" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            GenAI 快訊
                        </h1>
                        <p className="text-slate-400 text-sm">閱讀最新動態，回答問題得 XP</p>
                    </div>
                </div>

                {/* Summary stats */}
                <div className="flex gap-3 mt-4">
                    <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-purple-400" />
                        <span className="text-slate-300">{readItems.size}/{NEWS_ITEMS.length} 已閱讀</span>
                    </div>
                    <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-300">最多可得 {NEWS_ITEMS.reduce((a, n) => a + n.reward, 0)} XP</span>
                    </div>
                </div>
            </motion.div>

            {/* News list */}
            <div className="space-y-4">
                {NEWS_ITEMS.map((news, idx) => {
                    const isRead = readItems.has(news.id);
                    const isActive = activeQuiz === news.id;

                    return (
                        <motion.div
                            key={news.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={cn(
                                "glass-card border overflow-hidden transition-all",
                                isRead ? "border-green-500/20" : "border-white/10",
                                isActive && "border-cyan-500/30"
                            )}
                        >
                            {/* Category bar */}
                            <div className="h-1 w-full" style={{ background: news.categoryColor }} />

                            <div className="p-5">
                                {/* Meta */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span
                                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                                        style={{ background: `${news.categoryColor}22`, color: news.categoryColor }}
                                    >
                                        {news.category}
                                    </span>
                                    <span className="text-xs text-slate-600">{news.source}</span>
                                    <span className="text-xs text-slate-700">·</span>
                                    <span className="text-xs text-slate-600">{news.date}</span>
                                    {isRead && (
                                        <span className="ml-auto text-xs text-green-400">✓ 已閱讀</span>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="font-bold text-white mb-2 leading-snug">{news.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed mb-4">{news.summary}</p>

                                {/* CTA */}
                                {!isActive ? (
                                    <button
                                        onClick={() => handleRead(news.id)}
                                        className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors group"
                                    >
                                        <span>{isRead ? "查看知識測驗" : "閱讀並答題"}</span>
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        <span className="text-yellow-400 flex items-center gap-0.5 ml-2">
                                            <Zap className="w-3 h-3" />
                                            +{news.reward} XP
                                        </span>
                                    </button>
                                ) : (
                                    /* Quiz */
                                    <AnimatePresence>
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="border-t border-white/10 pt-4 mt-2"
                                        >
                                            <p className="text-sm font-bold text-white mb-3">
                                                🧠 知識小測驗
                                            </p>
                                            <p className="text-sm text-slate-300 mb-3">{news.quiz.q}</p>
                                            <div className="space-y-2">
                                                {news.quiz.options.map((opt, i) => {
                                                    const isCorrect = i === news.quiz.correct;
                                                    const isSelected = i === quizAnswer;
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleQuizAnswer(news.id, i)}
                                                            className={cn(
                                                                "w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all",
                                                                !quizAnswered && "hover:border-purple-500/30 hover:bg-purple-500/5 border-white/10 glass-card",
                                                                quizAnswered && isCorrect && "border-green-500/50 bg-green-500/10 text-green-300",
                                                                quizAnswered && isSelected && !isCorrect && "border-red-500/50 bg-red-500/10 text-red-300",
                                                                quizAnswered && !isSelected && !isCorrect && "opacity-30 border-white/5"
                                                            )}
                                                        >
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {quizAnswered && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={cn(
                                                        "mt-3 text-sm font-bold flex items-center gap-2",
                                                        quizAnswer === news.quiz.correct ? "text-green-400" : "text-slate-400"
                                                    )}
                                                >
                                                    {quizAnswer === news.quiz.correct ? (
                                                        <><Zap className="w-4 h-4 text-yellow-400" />答對了！+{news.reward} XP 入帳 🎉</>
                                                    ) : (
                                                        "答錯了，但沒關係！繼續閱讀其他新聞 💪"
                                                    )}
                                                </motion.p>
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Newsletter CTA */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 glass-card p-5 border border-purple-500/20 bg-purple-500/5 text-center"
            >
                <p className="text-2xl mb-2">📬</p>
                <h3 className="font-bold text-white mb-1">訂閱 GenAI 每週快報</h3>
                <p className="text-sm text-slate-400 mb-4">每週精選 5 則最重要的 AI 新知，直送你的信箱</p>
                <div className="flex gap-2 max-w-sm mx-auto">
                    <input
                        type="email"
                        placeholder="your@email.com"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
                    />
                    <button className="btn-primary text-sm px-4 py-2">訂閱</button>
                </div>
            </motion.div>
        </div>
    );
}
