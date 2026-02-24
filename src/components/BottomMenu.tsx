"use client";
import { Map as MapIcon, Swords, Trophy, Newspaper, Brain } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "宇宙地圖", icon: MapIcon },
  { href: "/arena", label: "競技場", icon: Swords },
  { href: "/leaderboard", label: "排行榜", icon: Trophy },
  { href: "/news", label: "AI 快訊", icon: Newspaper },
  { href: "/lab", label: "我的實驗室", icon: Brain },
];

export default function BottomMenu() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 px-4 py-3 sm:py-4 flex justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="w-full max-w-md flex items-center justify-between gap-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (pathname === "/" && href === "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "p-3 rounded-2xl flex items-center justify-center transition-all duration-200",
                isActive
                  ? "bg-purple-500 text-white shadow-md scale-110"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
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
