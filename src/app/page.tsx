"use client";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { type Planet, type Level } from "@/lib/gameData";
import { Lock, Star, Zap, CheckCircle2, Sword, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import DailyRewardModal from "@/components/DailyRewardModal";
import LevelModal from "@/components/LevelModal";

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



const BackgroundGraphics = ({ colorPreset }: { colorPreset: number }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <svg width="100%" height="100%" className="absolute inset-0">
        <circle cx="15%" cy="15%" r="6" fill="white" opacity="0.3" />
        <circle cx="85%" cy="25%" r="4" fill="white" opacity="0.2" />
        <circle cx="20%" cy="75%" r="8" fill="white" opacity="0.15" />
        <circle cx="80%" cy="85%" r="5" fill="white" opacity="0.4" />
        <circle cx="50%" cy="50%" r="3" fill="white" opacity="0.5" />
        <circle cx="10%" cy="90%" r="4" fill="white" opacity="0.6" />

        {colorPreset % 3 === 0 && (
          <>
            <circle cx="90%" cy="10%" r="150" fill="white" opacity="0.05" />
            <path d="M-50,200 Q150,50 350,250 T700,150" fill="none" stroke="white" strokeWidth="30" opacity="0.05" />
          </>
        )}
        {colorPreset % 3 === 1 && (
          <>
            <polygon points="100,20 200,150 0,150" fill="white" opacity="0.05" transform="translate(200, 50) rotate(25) scale(1.2)" />
            <circle cx="5%" cy="85%" r="200" fill="white" opacity="0.03" />
          </>
        )}
        {colorPreset % 3 === 2 && (
          <>
            <rect x="70%" y="30%" width="200" height="200" rx="40" fill="white" opacity="0.05" transform="rotate(15)" />
            <circle cx="50%" cy="95%" r="250" fill="white" opacity="0.03" />
          </>
        )}
      </svg>
    </div>
  );
};

export default function WorldMapPage() {
  const { level, xp, streak, completedLevels, checkDailyLogin, showDailyReward, setCurrentPlanet, setCurrentLevel, currentLevel } = useGameStore();

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedPlanetForModal, setSelectedPlanetForModal] = useState<Planet | null>(null);
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewIndex, setViewIndex] = useState(-1);
  const initialized = useRef(false);


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

  const sortedPlanets = [...planets];
  const allSortedLevels = sortedPlanets.flatMap(p =>
    levels.filter(l => l.planetId === p.id).sort((a, b) => a.number - b.number)
  );

  // Pre-compute unlocks
  let isPreviousLevelCompleted = true;
  const planetLockedState = new Map<string, boolean>();
  const levelAvailability = new Map<string, { isAvailable: boolean, isCompleted: boolean }>();

  sortedPlanets.forEach((p, pIndex) => {
    const pLevels = levels.filter(l => l.planetId === p.id).sort((a, b) => a.number - b.number);
    planetLockedState.set(p.id, pIndex > 0 ? !isPreviousLevelCompleted : false);

    pLevels.forEach((lvl) => {
      const isCompleted = completedLevels?.has(Number(lvl.id)) || false;
      const isAvailable = isPreviousLevelCompleted || isCompleted;
      levelAvailability.set(lvl.id, { isAvailable, isCompleted });
      if (!isCompleted) isPreviousLevelCompleted = false;
    });
  });

  // Init view index
  useEffect(() => {
    if (!loading && !initialized.current && sortedPlanets.length > 0 && completedLevels !== undefined) {
      let activeIdx = 0;
      for (let i = 0; i < sortedPlanets.length; i++) {
        if (!planetLockedState.get(sortedPlanets[i].id)) {
          activeIdx = i;
        }
      }
      setViewIndex(activeIdx);
      initialized.current = true;
    }
  }, [loading, sortedPlanets, planetLockedState, completedLevels]);

  if (loading || viewIndex === -1) {
    return (
      <div className="min-h-screen bg-[#0b1426] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const currentPlanetInfo = sortedPlanets[viewIndex];
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
    if (viewIndex < sortedPlanets.length - 1) setViewIndex(v => v + 1);
  };

  const handlePrevPlanet = () => {
    if (viewIndex > 0) setViewIndex(v => v - 1);
  };

  // Swipe handling
  let touchStartY = 0;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    if (diff > 80) handleNextPlanet(); // swipe up to go forward down map
    else if (diff < -80) handlePrevPlanet(); // swipe down to go back up map
  };

  return (
    <div
      className="min-h-screen w-full text-white font-sans overflow-x-hidden font-['Inter',sans-serif] transition-colors duration-700 ease-in-out relative flex flex-col pt-16 pb-32"
      style={{ backgroundColor: isPlanetLocked ? '#1e293b' : bgColor }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <BackgroundGraphics colorPreset={viewIndex} />

      {/* Top Bar - Duolingo Style */}
      <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-black/30 rounded-full p-1.5 px-4 flex items-center gap-2 font-black text-[#1cb0f6] shadow-sm">
            <Star className="w-5 h-5 fill-current" />
            <span className="text-lg">{level}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 flex-1">
          <div className="bg-black/30 rounded-full p-1.5 px-4 flex items-center gap-2 font-black text-[#ffc800] shadow-sm">
            <Zap className="w-5 h-5 fill-current" />
            <span className="text-lg">{xp.toLocaleString()}</span>
          </div>
          <div className="bg-black/30 rounded-full p-1.5 px-4 flex items-center gap-2 font-black text-[#ff9600] shadow-sm">
            <span className="text-lg">🔥</span>
            <span className="text-lg">{streak}</span>
          </div>
        </div>
      </div>

      {showDailyReward && <DailyRewardModal />}

      <div className="max-w-md mx-auto w-full px-4 flex-1 flex flex-col relative z-20">

        {/* Top-left internal text */}
        <div className="mt-6 mb-8">
          <h2 className="text-4xl font-black tracking-widest uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
            {currentPlanetInfo.name}
          </h2>
          <p className="font-bold opacity-90 text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]">
            {currentPlanetInfo.subtitle}
          </p>
          {isPlanetLocked && (
            <div className="mt-2 flex items-center gap-2 text-white/50 bg-black/20 self-start px-3 py-1 rounded-full w-max">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-bold">LOCKED</span>
            </div>
          )}
        </div>

        {/* Up arrow for previous planet */}
        {viewIndex > 0 && (
          <div className="flex justify-center mb-6">
            <button
              onClick={handlePrevPlanet}
              className="bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-sm transition shadow-lg active:scale-95"
            >
              <ChevronUp className="w-8 h-8 text-white drop-shadow-md" />
            </button>
          </div>
        )}

        {/* Path of Levels */}
        <div className="flex flex-col items-center relative py-4 flex-1">
          {planetLevels.map((lvl, lIndex) => {
            const { isAvailable, isCompleted } = levelAvailability.get(lvl.id) || { isAvailable: false, isCompleted: false };

            const amplitude = 80;
            const pattern = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7];
            const xOffset = pattern[lIndex % pattern.length] * amplitude;
            const isCurrent = isAvailable && !isCompleted && !isPlanetLocked;

            let btnBg = "bg-[#e5e5e5] border-[#b3b3b3] text-[#afafaf]";
            let iconColor = "text-[#afafaf]";
            let Icon = Star;

            if (isPlanetLocked) {
              btnBg = "bg-white/20 border-white/10 text-white/40";
              iconColor = "text-white/40";
              Icon = Lock;
            } else if (isCompleted) {
              btnBg = "bg-[#ffc800] border-[#e5a900] text-white";
              iconColor = "text-white";
              Icon = CheckCircle2;
            } else if (isCurrent) {
              btnBg = "bg-[#1cb0f6] border-[#1899d6] text-white";
              iconColor = "text-white";
              Icon = Star;
            } else if (lvl.type === 'boss') {
              Icon = Sword;
              if (isAvailable && !isCompleted) {
                btnBg = "bg-[#ff4b4b] border-[#ea2b2b] text-white";
                iconColor = "text-white";
              }
            }

            return (
              <div key={lvl.id} className="relative flex justify-center items-center w-full" style={{ height: "90px" }}>
                <motion.button
                  whileHover={isAvailable && !isPlanetLocked ? { scale: 1.05 } : {}}
                  whileTap={isAvailable && !isPlanetLocked ? { scale: 0.95 } : {}}
                  onClick={() => handleClickLevel(lvl, currentPlanetInfo, isAvailable && !isPlanetLocked)}
                  className={cn(
                    "relative rounded-full w-[76px] h-[76px] border-b-[8px] flex items-center justify-center transition-all z-10 shadow-lg",
                    btnBg,
                    (!isAvailable || isPlanetLocked) && "opacity-80 cursor-not-allowed",
                    isCurrent && "animate-bounce mt-2"
                  )}
                  style={{ transform: `translateX(${xOffset}px)` }}
                >
                  {isCurrent && (
                    <div className="absolute -top-12 bg-white text-[#1cb0f6] text-sm font-black px-4 py-2 rounded-2xl border-[3px] border-[#1cb0f6] shadow-md animate-pulse whitespace-nowrap">
                      START
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#1cb0f6]"></div>
                      <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
                    </div>
                  )}
                  <Icon className={cn("w-9 h-9", iconColor, isCompleted && "fill-current")} />
                </motion.button>
              </div>
            );
          })}
        </div>

        {/* Down arrow for next planet */}
        {viewIndex < sortedPlanets.length - 1 && (
          <div className="flex justify-center mt-6 mb-6">
            <button
              onClick={handleNextPlanet}
              className="bg-white/20 hover:bg-white/30 p-4 rounded-full backdrop-blur-sm transition shadow-lg active:scale-95 animate-bounce"
            >
              <ChevronDown className="w-10 h-10 text-white drop-shadow-md" />
            </button>
          </div>
        )}

      </div>

      {showLevelModal && selectedPlanetForModal && (
        <LevelModal
          onClose={() => setShowLevelModal(false)}
          planetName={selectedPlanetForModal.name}
          levelId={currentLevel?.toString() || ""}
          levelNumber={levels.find(l => String(l.id) === String(currentLevel))?.number || 1}
          rollup={selectedPlanetForModal.id}
        />
      )}



    </div>
  );
}
