"use client";
import { Map as MapIcon, Swords, Trophy, Newspaper } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "宇宙地圖", icon: MapIcon },
  { href: "/arena", label: "競技場", icon: Swords },
  { href: "/leaderboard", label: "排行榜", icon: Trophy },
  { href: "/news", label: "AI 快訊", icon: Newspaper },
];

export default function BottomMenu() {
  const pathname = usePathname();

  if (pathname === "/lab") return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/15 backdrop-blur-xl border-t border-white/10 px-4 py-2 sm:py-2 flex w-[60%] max-w-[380px] min-w-[320px] rounded-full z-10">
      <div className="w-full max-w-md flex items-center justify-between gap-2">
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
                  : "bg-transparent text-white/50 hover:bg-white/10 hover:text-white/80"
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
