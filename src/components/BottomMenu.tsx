"use client";
import { Map as MapIcon, Swords, Trophy, Flame } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Map", icon: MapIcon },
  { href: "/news", label: "News", icon: Flame },
  { href: "/arena", label: "Arena", icon: Swords },
  { href: "/leaderboard", label: "Ranking", icon: Trophy },
];

export default function BottomMenu() {
  const pathname = usePathname();

  // Hide on certain pages if needed
  // if (pathname === "/lab") return null;

  return (
    <div className={cn(
      "fixed z-10 flex",
      "bottom-4 left-1/2 -translate-x-1/2 w-[85%] sm:w-[60%] max-w-[380px] min-w-[320px]",
      "bg-[#150f24] border-b-[6px] border-[#0a0710] px-3 py-3 sm:py-3 rounded-[36px] shadow-2xl",
      "md:bottom-8 md:left-8 md:translate-x-0 md:w-auto md:min-w-0"
    )}>
      <div className="w-full max-w-md flex md:flex-col items-center justify-between gap-1 md:gap-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (pathname === "/" && href === "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "p-3 rounded-full flex items-center justify-center transition-all duration-200",
                isActive
                  ? "bg-[#05d9e8] text-[#0a0710] border-b-[4px] border-[#03a3ae] scale-110 shadow-[0_4px_0_rgba(0,0,0,0.2)]"
                  : "bg-transparent text-[#5c4a82] hover:bg-[#261c40] hover:text-[#05d9e8] md:bg-[#1f1635] md:hover:bg-[#2a1e4a]"
              )}
            >
              <Icon className={cn("w-7 h-7 sm:w-8 sm:h-8", isActive && "fill-current drop-shadow-sm")} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
