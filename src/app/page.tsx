"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { type Planet, type Level } from "@/types/game";
import { Lock, Star, CheckCircle2, Sword, ChevronLeft, ChevronRight, Building, Rocket, Globe, Flame } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import DailyRewardModal from "./_components/DailyRewardModal";
import LevelModal from "./_components/LevelModal";
import BackgroundGraphics from "./_components/BackgroundGraphics";

const PLANET_COLORS = [
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#22c55e", // Green
  "#f97316", // Orange
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#eab308", // Yellow
  "#f43f5e", // Rose
];

export default function WorldMapPage() {
  const router = useRouter();
  const { level, completedLevels, checkDailyLogin, showDailyReward, setCurrentPlanet, setCurrentLevel, currentLevel, levelProgress, streak } = useGameStore();

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedPlanetForModal, setSelectedPlanetForModal] = useState<Planet | null>(null);
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);


  const [viewIndex, setViewIndex] = useState(-1);
  const [direction, setDirection] = useState(0);
  const initialized = useRef(false);
  const touchStartX = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [planetsResponse, levelsResponse] = await Promise.all([
          fetch('/api/planets'),
          fetch('/api/levels')
        ]);
        const planetsResult = await planetsResponse.json();
        const levelsResult = await levelsResponse.json();
        if (planetsResult.success) {
          setPlanets(planetsResult.data);
        }
        if (levelsResult.success) {
          setLevels(levelsResult.data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    checkDailyLogin();
  }, [checkDailyLogin]);

  const orderedPlanets = useMemo(() => [...planets], [planets]);

  // Pre-compute unlocks
  const { planetLockedState, levelAvailability } = useMemo(() => {
    const planetLockedState = new Map<string, boolean>();
    const levelAvailability = new Map<string | number, { isAvailable: boolean, isCompleted: boolean }>();
    let isPreviousLevelCompleted = true;

    orderedPlanets.forEach((p, pIndex) => {
      const pLevels = levels.filter(l => l.planetId === p.id).sort((a, b) => a.number - b.number);
      planetLockedState.set(p.id, pIndex > 0 ? !isPreviousLevelCompleted : false);

      pLevels.forEach((lvl) => {
        const isCompleted = completedLevels?.has(Number(lvl.id)) || false;
        const isAvailable = isPreviousLevelCompleted || isCompleted;
        levelAvailability.set(lvl.id, { isAvailable, isCompleted });
        if (!isCompleted) isPreviousLevelCompleted = false;
      });
    });

    return { planetLockedState, levelAvailability };
  }, [orderedPlanets, levels, completedLevels]);

  // Init view index
  useEffect(() => {
    if (!loading && !initialized.current && orderedPlanets.length > 0 && completedLevels !== undefined) {
      let activeIdx = 0;
      for (let i = 0; i < orderedPlanets.length; i++) {
        if (!planetLockedState.get(orderedPlanets[i].id)) {
          activeIdx = i;
        }
      }
      setViewIndex(activeIdx);
      initialized.current = true;
    }
  }, [loading, orderedPlanets, planetLockedState, completedLevels]);

  if (loading || viewIndex === -1) {
    return (
      <div className="min-h-screen bg-[#0b1426] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const currentPlanetInfo = orderedPlanets[viewIndex];
  const planetLevels = levels.filter(l => l.planetId === currentPlanetInfo.id).sort((a, b) => a.number - b.number);
  const isPlanetLocked = planetLockedState.get(currentPlanetInfo.id);
  const bgColor = PLANET_COLORS[viewIndex % PLANET_COLORS.length];

  const handleClickLevel = (lvl: Level, p: Planet, isAvailable: boolean) => {
    if (!isAvailable) return;
    setCurrentPlanet(p.id);
    setCurrentLevel(lvl.id);
    setSelectedPlanetForModal(p);
    setShowLevelModal(true);
  };

  const handleNextPlanet = () => {
    if (viewIndex < orderedPlanets.length - 1) {
      setDirection(1);
      setViewIndex(v => v + 1);
    }
  };

  const handlePrevPlanet = () => {
    if (viewIndex > 0) {
      setDirection(-1);
      setViewIndex(v => v - 1);
    }
  };



  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 80) handleNextPlanet(); // swipe left to go forward
    else if (diff < -80) handlePrevPlanet(); // swipe right to go back
  };

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.9,
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.9,
      };
    }
  };

  return (
    <div
      className="min-h-screen w-full text-white font-sans overflow-x-hidden font-['Inter',sans-serif] relative flex flex-col pt-16 pb-32 bg-[#090812]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Seamless cosmic aura transition */}
      <div
        className="absolute inset-0 transition-colors duration-[1500ms] ease-in-out opacity-25 pointer-events-none mix-blend-screen"
        style={{ backgroundColor: isPlanetLocked ? '#1e293b' : bgColor }}
      />
      {/* Deep space radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#090812_90%)] pointer-events-none opacity-90" />

      <BackgroundGraphics colorPreset={viewIndex} />

      {/* Top Bar - Simplified Duolingo Style */}
      <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-4 pb-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Level & XP Link to Lab */}
          <Link
            href="/lab"
            className="flex flex-col gap-1.5 bg-[#18102e]/60 backdrop-blur-md border-[3px] border-[#0c0817] px-4 py-2 rounded-[20px] shadow-lg min-w-[120px] active:translate-y-1 hover:bg-[#18102e]/80 transition-all"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-black text-white/90 text-[11px] tracking-widest whitespace-nowrap uppercase">Level {level}</span>
            </div>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-[#05d9e8] rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_#05d9e8]"
                style={{ width: `${levelProgress || 0}%` }}
              />
            </div>
          </Link>
        </div>
      </div>

      {showDailyReward && <DailyRewardModal />}

      {/* Left arrow for previous planet */}
      {viewIndex > 0 && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30 hidden sm:block">
          <button
            onClick={handlePrevPlanet}
            className="bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-sm transition shadow-lg active:scale-95"
          >
            <ChevronLeft className="w-10 h-10 text-white drop-shadow-md" />
          </button>
        </div>
      )}

      {/* Right arrow for next planet */}
      {viewIndex < orderedPlanets.length - 1 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 hidden sm:block">
          <button
            onClick={handleNextPlanet}
            className="bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-sm transition shadow-lg active:scale-95 animate-pulse"
          >
            <ChevronRight className="w-10 h-10 text-white drop-shadow-md" />
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto w-full flex-1 flex flex-col relative z-20 overflow-visible">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={viewIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.4 },
            }}
            className="flex flex-col flex-1 px-4 h-full"
          >
            {/* Top-left internal text */}
            <div className="mt-8 mb-4 text-center">
              <h2 className="text-4xl font-black tracking-widest uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
                {currentPlanetInfo.name}
              </h2>
              <p className="font-bold opacity-90 text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]">
                {currentPlanetInfo.subtitle}
              </p>
              {isPlanetLocked && (
                <div className="mt-2 flex justify-center text-white/50 bg-black/20 self-center px-3 py-1 rounded-full w-max mx-auto">
                  <Lock className="w-4 h-4 mr-2" />
                  <span className="text-sm font-bold">LOCKED</span>
                </div>
              )}
            </div>

            {/* Path of Levels */}
            <div className="flex flex-col items-center relative py-4 flex-1 justify-center">
              {planetLevels.map((lvl, lIndex) => {
                const { isAvailable, isCompleted } = levelAvailability.get(lvl.id) || { isAvailable: false, isCompleted: false };

                const amplitude = 80;
                const pattern = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7];
                const xOffset = pattern[lIndex % pattern.length] * amplitude;
                const isCurrent = isAvailable && !isCompleted && !isPlanetLocked;

                // 3D Sphere styling with Gray, Blue, Yellow color scheme
                let btnBg = "bg-[#9ca3af] shadow-[inset_-8px_-10px_0_rgba(0,0,0,0.15),0_6px_0_rgba(0,0,0,0.15)] text-[#4b5563]";
                let iconColor = "text-[#4b5563]";
                let Icon = Star;

                if (isPlanetLocked) {
                  btnBg = "bg-[#4b5563] shadow-[inset_-8px_-10px_0_rgba(0,0,0,0.25),0_6px_0_rgba(0,0,0,0.15)] text-[#1f2937]";
                  iconColor = "text-[#1f2937]";
                  Icon = Lock;
                } else if (isCompleted) {
                  btnBg = "bg-[#1cb0f6] shadow-[inset_-8px_-10px_0_rgba(0,0,0,0.2),0_6px_0_rgba(0,0,0,0.15)] text-[#ffffff]";
                  iconColor = "text-[#ffffff]";
                  Icon = CheckCircle2;
                } else if (isCurrent) {
                  btnBg = "bg-[#ffc800] shadow-[inset_-8px_-10px_0_rgba(0,0,0,0.15),0_6px_0_rgba(0,0,0,0.15)] text-[#5c4700]";
                  iconColor = "text-[#5c4700]";
                  Icon = Star;
                } else if (lvl.type === 'boss') {
                  Icon = Sword;
                  if (isAvailable && !isCompleted) {
                    btnBg = "bg-[#ffc800] shadow-[inset_-8px_-10px_0_rgba(0,0,0,0.15),0_6px_0_rgba(0,0,0,0.15)] text-[#5c4700]";
                    iconColor = "text-[#5c4700]";
                  }
                }

                return (
                  <div key={lvl.id} className="relative flex justify-center items-center w-full" style={{ height: "90px" }}>
                    <motion.button
                      whileHover={isAvailable && !isPlanetLocked ? { scale: 1.05 } : {}}
                      whileTap={isAvailable && !isPlanetLocked ? { scale: 0.95 } : {}}
                      onClick={() => handleClickLevel(lvl, currentPlanetInfo, isAvailable && !isPlanetLocked)}
                      className={cn(
                        "relative rounded-full w-[76px] h-[76px] flex items-center justify-center transition-all z-10",
                        btnBg,
                        (!isAvailable || isPlanetLocked) && "opacity-80 cursor-not-allowed",
                        isCurrent && "animate-bounce mt-2"
                      )}
                      style={{ left: `${xOffset}px` }}
                    >
                      {isCurrent && (
                        <div className="absolute -top-12 bg-[#ffc800] text-[#5c4700] text-sm font-black px-4 py-2 rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.15)] animate-pulse whitespace-nowrap">
                          START
                          <div className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#ffc800]"></div>
                        </div>
                      )}
                      <Icon className={cn("w-9 h-9", iconColor, isCompleted && "fill-current")} />
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile nav controls (visible only on small screens) */}
      <div className="sm:hidden fixed bottom-6 left-0 right-0 z-30 flex justify-between px-6 pointer-events-none">
        {viewIndex > 0 ? (
          <button
            onClick={handlePrevPlanet}
            className="pointer-events-auto bg-black/30 hover:bg-black/40 p-3 rounded-full backdrop-blur-sm transition shadow-lg active:scale-95 border border-white/10"
          >
            <ChevronLeft className="w-8 h-8 text-white drop-shadow-md" />
          </button>
        ) : <div className="w-14" />}

        {viewIndex < orderedPlanets.length - 1 ? (
          <button
            onClick={handleNextPlanet}
            className="pointer-events-auto bg-black/30 hover:bg-black/40 p-3 rounded-full backdrop-blur-sm transition shadow-lg active:scale-95 border border-white/10 animate-pulse"
          >
            <ChevronRight className="w-8 h-8 text-white drop-shadow-md" />
          </button>
        ) : <div className="w-14" />}
      </div>

      {showLevelModal && selectedPlanetForModal && (() => {
        const currentLevelData = levels.find(l => String(l.id) === String(currentLevel));
        return (
          <LevelModal
            onClose={() => setShowLevelModal(false)}
            planetName={selectedPlanetForModal.name}
            levelTitle={currentLevelData?.title || ""}
            levelId={currentLevel?.toString() || ""}
            levelNumber={currentLevelData?.number || 1}
            rollup={selectedPlanetForModal.id}
          />
        );
      })()}
    </div>
  );
}
