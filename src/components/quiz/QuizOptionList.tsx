"use client";
import { cn } from "@/lib/utils";

interface QuizOptionListProps {
    options: string[];
    correctIndex: number;
    selectedIndex: number | null;
    pendingIndex: number | null;
    answered: boolean;
    onSelect: (index: number) => void;
}

/**
 * Compute option styling based on quiz state.
 * Shared between LevelModal and NewsPage quiz flows.
 */
function getOptionStyles(
    idx: number,
    correctIndex: number,
    selectedIndex: number | null,
    pendingIndex: number | null,
    answered: boolean,
) {
    const isCorrect = idx === correctIndex;
    const isSelected = idx === selectedIndex;
    const isPending = pendingIndex === idx;

    let btnClass = "bg-[#15113B] border-[#0A0A26] text-white shadow-[0_10px_0_#0A0A26]";
    let icon = (idx + 1).toString();
    let iconBoxClass = "bg-[#2a2a6e] text-white border-[3px] border-[#0A0A26]";

    if (answered) {
        if (isCorrect) {
            icon = "✓";
            iconBoxClass = "bg-[#58cc02] text-white border-transparent";
        } else if (isSelected) {
            btnClass = "bg-[#2a2a6e] border-[#0A0A26] text-white shadow-[0_10px_0_#0A0A26]";
            icon = "×";
            iconBoxClass = "bg-[#FF1E56] text-white border-transparent";
        }
    } else if (isPending) {
        btnClass = "bg-[#05d9e8] border-[#0A0A26] text-[#0a0710] shadow-[0_10px_0_#0A0A26] -translate-y-1";
    }

    return { btnClass, icon, iconBoxClass, isCorrect, isSelected, isPending };
}

export default function QuizOptionList({
    options,
    correctIndex,
    selectedIndex,
    pendingIndex,
    answered,
    onSelect,
}: QuizOptionListProps) {
    return (
        <div className="grid grid-cols-1 gap-5 mb-10 px-1 py-2">
            {options.map((opt, idx) => {
                const { btnClass, icon, iconBoxClass, isCorrect, isSelected, isPending } =
                    getOptionStyles(idx, correctIndex, selectedIndex, pendingIndex, answered);

                // After answering, only show the correct option and the user's incorrect choice
                if (answered && !isCorrect && !isSelected) return null;

                return (
                    <button
                        key={idx}
                        disabled={answered}
                        onClick={() => onSelect(idx)}
                        className={cn(
                            "relative w-full text-left p-6 rounded-[28px] border-[4px] transition-all duration-400 font-bold text-lg sm:text-xl flex items-center gap-6",
                            btnClass,
                            !answered && !isPending && "hover:bg-[#201d5c] hover:-translate-y-1 active:translate-y-1 active:shadow-[0_4px_0_#0A0A26]",
                            answered && "cursor-default"
                        )}
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl transition-colors",
                            iconBoxClass
                        )}>
                            {icon}
                        </div>
                        <span className="flex-1 leading-snug">{opt}</span>
                    </button>
                );
            })}
        </div>
    );
}
