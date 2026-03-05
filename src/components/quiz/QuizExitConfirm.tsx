"use client";
import { AlertTriangle } from "lucide-react";

interface QuizExitConfirmProps {
    visible: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * "Abort Mission?" confirmation modal for quitting a quiz mid-way.
 * Shared between LevelModal and NewsPage quiz flows.
 */
export default function QuizExitConfirm({
    visible,
    message,
    onConfirm,
    onCancel,
}: QuizExitConfirmProps) {
    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
            <div className="bg-[#1b1236] border-[6px] border-[#100a1f] rounded-[40px] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
                <div className="w-20 h-20 bg-[#ff9600] rounded-full flex items-center justify-center mx-auto shadow-[0_8px_0_#cc7800] border-b-4 border-[#cc7800]">
                    <AlertTriangle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                    Abort Mission?
                </h3>
                <p className="text-[#b8aae0] font-bold text-sm leading-relaxed">
                    {message}
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className="w-full py-5 bg-[#251847] text-[#ff2262] rounded-[24px] font-black text-lg border-b-[6px] border-[#19102e] tracking-widest hover:bg-[#2d1d56]"
                    >
                        Yes
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-5 bg-[#05d9e8] text-[#0a0710] rounded-[24px] font-black text-lg border-b-[6px] border-[#03b8c4] tracking-widest"
                    >
                        No
                    </button>
                </div>
            </div>
        </div>
    );
}
