import db from "@/lib/db";

export interface LeaderboardEntryDTO {
    name: string | null;
    xp: number;
    level: number | null;
    streak: number;
    guild: string | null;
    avatar: string | null;
    rank: number;
}

export async function getLeaderboard(
    limit = 100,
): Promise<LeaderboardEntryDTO[]> {
    const raw = await db.players.findMany({
        orderBy: { xp: "desc" },
        take: limit,
    });

    return raw.map((player, index) => ({
        name: player.username,
        xp: player.xp,
        level: player.level,
        streak: player.streak_days,
        guild: player.guild_name,
        avatar: player.avatar,
        rank: index + 1,
    }));
}
