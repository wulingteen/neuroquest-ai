"use client";
import { Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const Jupiter = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <g transform="rotate(-15, 12, 12)">
      {/* Atmospheric bands */}
      <path d="M3.5 9s3.5-1 8.5-1 8.5 1 8.5 1" opacity="0.7" />
      <path d="M2 12h20" strokeWidth="2.5" />
      <path d="M3.5 15s3.5 1 8.5 1 8.5-1 8.5-1" opacity="0.7" />
      {/* The Great Red Spot */}
      <ellipse cx="16" cy="13.5" rx="2.5" ry="1.5" fill="currentColor" />
    </g>
  </svg>
);

const RocketWithWindows = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.5 5 2 5" />
    <path d="M12 15v5s5-.5 5-2" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
  </svg>
);

const NAV_ITEMS = [
  { href: "/", label: "Map", icon: Jupiter, activeBg: "bg-[#FFB800]", activeText: "text-[#4c1d95]" }, // Yellow bg, Deep Purple text
  { href: "/news", label: "News", icon: RocketWithWindows, activeBg: "bg-[#FF1E56]", activeText: "text-white" },
  { href: "/arena", label: "Arena", icon: Swords, activeBg: "bg-[#00D4FF]", activeText: "text-white" },
  { href: "/leaderboard", label: "Ranking", icon: Trophy, activeBg: "bg-[#22c55e]", activeText: "text-white" },
];

export default function BottomMenu() {
  const pathname = usePathname();

  return (
    <div className={cn(
      "fixed z-50 flex justify-center",
      "bottom-4 left-0 right-0 w-full px-4 sm:px-0 pointer-events-none"
    )}>
      <div className={cn(
        "bg-[#1b1236] border-[4px] border-[#100a1f] p-2 rounded-[32px] shadow-[0_8px_0_#100a1f]",
        "w-full max-w-[400px] flex items-center justify-between gap-2 pointer-events-auto"
      )}>
        {NAV_ITEMS.map(({ href, label, icon: Icon, activeBg, activeText }) => {
          const isActive = pathname === href || (pathname === "/" && href === "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "relative flex-1 py-3 px-1 rounded-[24px] flex flex-col items-center justify-center transition-all duration-150 overflow-hidden",
                isActive
                  ? `${activeBg} ${activeText} border-[3px] border-[#100a1f] shadow-[0_4px_0_#100a1f] mt-[-4px] mb-[4px]`
                  : "bg-transparent text-[#8a72b8] border-[3px] border-transparent hover:bg-[#251847] hover:text-white"
              )}
            >
              <div className="flex flex-col items-center gap-1 z-10 relative">
                <Icon
                  strokeWidth={isActive ? 2 : 2.5}
                  fill="currentColor"
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 transition-transform",
                    isActive ? "scale-110" : ""
                  )}
                />
                {isActive && (
                  <span className="text-[10px] font-black uppercase tracking-widest mt-0.5 pointer-events-none">
                    {label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
