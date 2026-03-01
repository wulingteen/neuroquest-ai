import db from "@/lib/db";

export interface AchievementDTO {
    id: string;
    name: string | null;
    description: string | null;
    icon: string | null;
    rarity: string | null;
    xpReward: number;
}

export async function getAllAchievements(): Promise<AchievementDTO[]> {
    const raw = await db.achievements.findMany({
        orderBy: { xp_reward: "asc" },
    });

    return raw.map((a) => ({
        id: a.achievement_id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        rarity: a.rarity,
        xpReward: a.xp_reward,
    }));
}
