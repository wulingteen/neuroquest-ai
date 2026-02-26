"use client";
import { Rocket, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const Saturn = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <clipPath id="saturn-back">
        <path d="M 0 0 H 24 V 12 L 0 12 Z" />
      </clipPath>
      <clipPath id="saturn-front">
        <path d="M 0 24 H 24 V 12 L 0 12 Z" />
      </clipPath>
    </defs>
    {/* Ring back half */}
    <ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(15, 12, 12)" clipPath="url(#saturn-back)" />
    {/* Planet body */}
    <circle cx="12" cy="12" r="6.8" fill="currentColor" />
    {/* Ring front half */}
    <ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(15, 12, 12)" clipPath="url(#saturn-front)" strokeWidth="2.2" />
  </svg>
);



const NAV_ITEMS = [
  { href: "/", label: "Map", icon: Saturn, activeBg: "bg-[#FFB800]", activeText: "text-white" }, // Yellow bg, White text
  { href: "/news", label: "News", icon: Rocket, activeBg: "bg-[#FF1E56]", activeText: "text-white" },
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
