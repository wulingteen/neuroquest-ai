import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import BottomMenu from "@/components/layout/BottomMenu";
import StarField from "@/components/effects/StarField";
import GameInitializer from "@/components/providers/GameInitializer";
import TopScorerModal from "@/components/social/TopScorerModal";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "NeuroQuest AI — 探索 GenAI 宇宙",
  description: "透過遊戲化學習掌握生成式 AI 新知。結合八角理論打造極致學習體驗——Prompt Engineering、LLM 原理、AI 倫理，全都在這裡。",
  keywords: ["GenAI", "生成式AI", "Prompt Engineering", "LLM", "AI學習", "教育遊戲"],
  openGraph: {
    title: "NeuroQuest AI",
    description: "讓學習 GenAI 比打遊戲還上癮",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className={`${inter.variable} ${orbitron.variable}`}>
      <body className="min-h-screen min-h-screen bg-[#0D0D2B] text-slate-100 font-inter items-center">
        <GameInitializer />
        <TopScorerModal />
        <StarField />
        <main className="relative min-h-screen pb-20">
          {children}
        </main>
        <BottomMenu />
      </body>
    </html>
  );
}

