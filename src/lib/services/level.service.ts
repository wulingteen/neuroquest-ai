import db from "@/lib/db";

export interface LevelDTO {
    id: number;
    planetId: string;
    number: number;
    title: string | null;
    type: string | null;
    xpReward: number;
}

export async function getLevels(planetId?: string): Promise<LevelDTO[]> {
    const levelsRaw = await db.levels.findMany({
        where: planetId ? { rollup: planetId } : undefined,
        orderBy: planetId
            ? { level_number: "asc" }
            : [{ rollup: "asc" }, { level_number: "asc" }],
    });

    return levelsRaw.map((l) => ({
        id: l.level_id,
        planetId: l.rollup,
        number: l.level_number,
        title: l.title,
        type: l.content_type,
        xpReward: l.xp_reward,
    }));
}
