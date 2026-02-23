"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { getLevelTitle, type Planet, type Level } from "@/lib/gameData";
import { Lock, Star, Zap, ChevronRight, CheckCircle2, Shield, Sword } from "lucide-react";
import { cn } from "@/lib/utils";
import DailyRewardModal from "@/components/DailyRewardModal";
import LevelModal from "@/components/LevelModal";

export default function WorldMapPage() {
  const { level, xp, streak, completedLevels, checkDailyLogin, showDailyReward, setCurrentPlanet, setCurrentLevel, currentPlanet } = useGameStore();
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/planets');
        const result = await response.json();
        if (result.success) {
          setPlanets(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch planets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    checkDailyLogin();
  }, [checkDailyLogin]);

  useEffect(() => {
    if (selectedPlanet) {
      const fetchLevels = async () => {
        try {
          const response = await fetch(`/api/levels?planetId=${selectedPlanet}`);
          const result = await response.json();
          if (result.success) {
            setLevels(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch levels:", error);
        }
      };
      fetchLevels();
    }
  }, [selectedPlanet]);

  const handlePlanetClick = (planetId: string, locked: boolean) => {
    if (locked) return;
    setSelectedPlanet(planetId === selectedPlanet ? null : planetId);
    setCurrentPlanet(planetId);
  };

  const planet = planets.find((p) => p.id === selectedPlanet);

  return (
    <div className="relative min-h-screen px-4 py-6">
      {showDailyReward && <DailyRewardModal />}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black gradient-text" style={{ fontFamily: "Orbitron, sans-serif" }}>
              AI 宇宙地圖
            </h1>
            <p className="text-slate-400 mt-1">選擇一個星球，開始你的 GenAI 探索之旅</p>
          </div>
          {/* Stats row */}
          <div className="flex gap-3">
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-300">Lv.{level}</span>
              <span className="text-xs text-slate-500">{getLevelTitle(level)}</span>
            </div>
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-300">{xp.toLocaleString()} XP</span>
            </div>
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <span className="text-orange-400 text-sm">🔥</span>
              <span className="text-sm font-bold text-orange-300">{streak} 天</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Planet Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {planets.map((p, i) => {
            const completed = completedLevels ? completedLevels.size : 0;
            // Note: In a real scenario, we might want to fetch progress from DB too
            // For now, continuing to use the Zustand store progress
            const planetCompleted = levels.filter(
              (l) => l.planetId === p.id && completedLevels?.has(l.id)
            ).length;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                onClick={() => handlePlanetClick(p.id, p.locked)}
                className={cn(
                  "relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer group",
                  p.locked
                    ? "border-white/5 opacity-60 cursor-not-allowed"
                    : selectedPlanet === p.id
                      ? "border-2 scale-[1.02]"
                      : "border-white/10 hover:border-white/20 hover:scale-[1.01]"
                )}
                style={{
                  background: p.locked
                    ? "rgba(255,255,255,0.02)"
                    : `linear-gradient(135deg, rgba(13,13,43,0.9) 0%, ${p.color}22 100%)`,
                  borderColor: selectedPlanet === p.id && !p.locked ? p.color : undefined,
                  boxShadow: selectedPlanet === p.id && !p.locked
                    ? `0 0 30px ${p.glowColor}, 0 0 60px ${p.glowColor}50`
                    : undefined,
                }}
              >
                {/* Top banner */}
                <div
                  className="h-2 w-full"
                  style={{
                    background: p.locked ? "#1e293b" : `linear-gradient(90deg, ${p.color}, transparent)`,
                  }}
                />

                <div className="p-5">
                  {/* Planet icon + lock */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={cn("text-5xl", !p.locked && "group-hover:scale-110 transition-transform duration-300")}
                      style={{
                        filter: p.locked ? "grayscale(1)" : `drop-shadow(0 0 12px ${p.color})`,
                      }}
                    >
                      {p.icon}
                    </div>
                    {p.locked ? (
                      <div className="flex items-center gap-1 glass-card px-2 py-1 text-xs text-slate-500">
                        <Lock className="w-3 h-3" />
                        <span>未解鎖</span>
                      </div>
                    ) : (
                      <div
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ background: `${p.color}22`, color: p.color }}
                      >
                        {p.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Planet name */}
                  <h3
                    className="text-xl font-black mb-1"
                    style={{
                      fontFamily: "Orbitron, sans-serif",
                      color: p.locked ? "#334155" : p.color,
                    }}
                  >
                    {p.name}
                  </h3>
                  <p className={cn("text-sm mb-4", p.locked ? "text-slate-700" : "text-slate-400")}>
                    {p.description}
                  </p>

                  {/* Progress */}
                  {!p.locked && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{planetCompleted} / {p.totalLevels} 關卡</span>
                        <span>{Math.round((planetCompleted / p.totalLevels) * 100)}%</span>
                      </div>
                      <div className="xp-bar-track">
                        <div
                          className="xp-bar-fill"
                          style={{
                            width: `${(planetCompleted / p.totalLevels) * 100}%`,
                            background: `linear-gradient(90deg, ${p.color}, ${p.color}80)`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Locked requirement */}
                  {p.locked && p.requiredPlanet && (
                    <div className="text-xs text-slate-600 flex items-center gap-1 mt-2">
                      <Lock className="w-3 h-3" />
                      <span>
                        需完成{" "}
                        {planets.find((x) => x.id === p.requiredPlanet)?.name ?? p.requiredPlanet} 70%
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover overlay CTA */}
                {!p.locked && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute bottom-4 right-4 flex items-center gap-1 text-xs font-bold"
                    style={{ color: p.color }}
                  >
                    <span>進入星球</span>
                    <ChevronRight className="w-3 h-3" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Level panel when planet selected */}
      <AnimatePresence>
        {selectedPlanet && planet && (
          <motion.div
            key="level-panel"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.35 }}
            className="fixed bottom-0 left-0 right-0 z-40 glass-card rounded-t-3xl border-t border-white/10 p-6 pb-8 md:pb-6"
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" style={{ filter: `drop-shadow(0 0 8px ${planet.color})` }}>
                    {planet.icon}
                  </span>
                  <div>
                    <h3 className="font-black text-lg" style={{ color: planet.color, fontFamily: "Orbitron, sans-serif" }}>
                      {planet.name}
                    </h3>
                    <p className="text-xs text-slate-400">{planet.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlanet(null)}
                  className="text-slate-500 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Levels */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {levels.map((lvl, idx) => {
                  const done = completedLevels?.has(lvl.id);
                  const available = idx === 0 || completedLevels?.has(levels[idx - 1]?.id);
                  return (
                    <motion.button
                      key={lvl.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.06 }}
                      onClick={() => {
                        if (available) {
                          setCurrentLevel(lvl.id);
                          setShowLevelModal(true);
                        }
                      }}
                      className={cn(
                        "shrink-0 w-32 rounded-xl p-3 border text-left transition-all",
                        done
                          ? "border-green-500/50 bg-green-500/10"
                          : available
                            ? "border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer"
                            : "border-white/5 bg-white/2 opacity-40 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500">關卡 {lvl.number}</span>
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : lvl.type === "boss" ? (
                          <Sword className="w-4 h-4 text-red-400" />
                        ) : (
                          <Star className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-white leading-tight">{lvl.title}</p>
                      <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        {lvl.xpReward} XP
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showLevelModal && (
        <LevelModal
          onClose={() => setShowLevelModal(false)}
          planetName={planet?.name || ""}
          levelId={levels.find(l => l.id === useGameStore.getState().currentLevel)?.id || ""}
        />
      )}

    </div>
  );
}
