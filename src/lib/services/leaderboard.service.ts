import db from "@/lib/db";

export interface LeaderboardEntryDTO {
    name: string | null;
    xp: number;
    level: number | null;
    streak: number;
    guild: string | null;
    avatar: string | null;
    rank: number;
    victoryMessage?: string;
}

export async function getLeaderboard(
    limit = 100,
): Promise<LeaderboardEntryDTO[]> {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const raw = await db.players.findMany({
        orderBy: { xp: "desc" },
        take: limit,
        include: {
            daily_top_messages: {
                where: { message_date: todayDate },
                take: 1,
            },
        },
    });

    return raw.map((player, index) => ({
        name: player.username,
        xp: player.xp,
        level: player.level,
        streak: player.streak_days,
        guild: player.guild_name,
        avatar: player.avatar,
        rank: index + 1,
        victoryMessage: player.daily_top_messages[0]?.message,
    }));
}
