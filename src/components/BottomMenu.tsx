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
      "bg-white/15 backdrop-blur-xl border-t border-white/10 px-4 py-2 sm:py-2 rounded-full",
      "md:bottom-8 md:left-8 md:translate-x-0 md:w-auto md:min-w-0",
      "md:bg-transparent md:backdrop-blur-none md:border-none md:p-0"
    )}>
      <div className="w-full max-w-md flex md:flex-col items-center justify-between gap-2 md:gap-4">
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
                  ? "bg-[#ffc800] text-white shadow-md scale-110"
                  : "bg-transparent text-white/50 hover:bg-white/10 hover:text-white/80 md:bg-white/15 md:backdrop-blur-xl md:border md:border-white/10 md:hover:bg-white/20"
              )}
            >
              <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
