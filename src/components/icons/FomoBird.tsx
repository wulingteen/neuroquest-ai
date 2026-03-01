import { cn } from "@/lib/utils";

interface FomoBirdProps {
    className?: string;
    expression?: "happy" | "thinking" | "surprised" | "sad";
}

const FomoBird = ({ className, expression = "happy" }: FomoBirdProps) => {
    return (
        <svg viewBox="0 0 100 100" className={cn("w-24 h-24", className)}>
            {/* Body */}
            <circle cx="50" cy="60" r="35" fill="#FFE100" stroke="#0A0A26" strokeWidth="4" />
            {/* Wing */}
            <path d="M25,60 Q15,50 25,40" fill="none" stroke="#0A0A26" strokeWidth="4" strokeLinecap="round" />
            {/* Eyes */}
            {expression === "happy" && (
                <>
                    <circle cx="65" cy="50" r="6" fill="white" stroke="#0A0A26" strokeWidth="3" />
                    <circle cx="65" cy="50" r="2.5" fill="#0A0A26" />
                </>
            )}
            {expression === "thinking" && (
                <>
                    <path d="M60,45 L70,45" stroke="#0A0A26" strokeWidth="4" strokeLinecap="round" />
                </>
            )}
            {expression === "surprised" && (
                <>
                    <circle cx="65" cy="50" r="8" fill="white" stroke="#0A0A26" strokeWidth="3" />
                    <circle cx="65" cy="50" r="3" fill="#0A0A26" />
                </>
            )}
            {/* Beak */}
            <path d="M80,60 L95,65 L80,70 Z" fill="#FF7E5F" stroke="#0A0A26" strokeWidth="3" />
            {/* Legs */}
            <path d="M45,95 L45,100" stroke="#0A0A26" strokeWidth="3" strokeLinecap="round" />
            <path d="M55,95 L55,100" stroke="#0A0A26" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
};

export default FomoBird;
