import db from "@/lib/db";

export interface TopScorerStatus {
    isTopScorer: boolean;
    hasMessageToday: boolean;
    lastMessage: string | null;
}

export async function getTopScorerStatus(playerId: string): Promise<TopScorerStatus> {
    // 1. Get friends
    const friendships = await db.friends.findMany({
        where: { player_id: playerId },
        select: { friend_id: true }
    });

    const friendIds = friendships.map((f: { friend_id: string }) => f.friend_id);

    if (friendIds.length === 0) {
        // If no friends, technically you are top of your (small) circle?
        // But usually "top among friends" implies having friends.
        // The prompt says "highest among all their friends".
        // Let's assume if 0 friends, you are not prompted.
        return { isTopScorer: false, hasMessageToday: false, lastMessage: null };
    }

    // 2. Get player XP
    const player = await db.players.findUnique({
        where: { player_id: playerId },
        select: { xp: true }
    });

    if (!player) return { isTopScorer: false, hasMessageToday: false, lastMessage: null };

    // 3. Get max XP among friends
    const friends = await db.players.findMany({
        where: { player_id: { in: friendIds } },
        select: { xp: true }
    });

    const maxFriendXp = friends.length > 0 ? Math.max(...friends.map((f: { xp: number }) => f.xp)) : -1;

    const isTopScorer = player.xp > maxFriendXp;

    // 4. Check if message exists for today
    const today = new Date();
    // Ensure we compare only the date part
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const todayMessage = await db.daily_top_messages.findFirst({
        where: {
            player_id: playerId,
            message_date: todayDate
        }
    });

    // 5. Get the most recent message for quick re-use
    const lastUsedMessage = await db.daily_top_messages.findFirst({
        where: {
            player_id: playerId,
        },
        orderBy: { message_date: 'desc' },
    });

    return {
        isTopScorer,
        hasMessageToday: !!todayMessage,
        lastMessage: lastUsedMessage?.message || null,
    };
}

export async function setDailyTopMessage(playerId: string, message: string): Promise<void> {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    await db.daily_top_messages.upsert({
        where: {
            player_id_message_date: {
                player_id: playerId,
                message_date: todayDate
            }
        },
        update: { message },
        create: {
            player_id: playerId,
            message,
            message_date: todayDate
        }
    });
}
