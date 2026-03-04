import db from "@/lib/db";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface FriendDTO {
    player_id: string;
    username: string | null;
    avatar: string | null;
    xp: number;
    level: number | null;
    streak: number;
}

export interface FriendsLeaderboardEntryDTO {
    name: string | null;
    xp: number;
    level: number | null;
    streak: number;
    guild: string | null;
    avatar: string | null;
    rank: number;
    victoryMessage?: string;
    isMe: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAYER_USERNAME = "YouPlayer";

async function getCurrentPlayer() {
    return db.players.findUnique({ where: { username: PLAYER_USERNAME } });
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * List all friends of the current player (YouPlayer).
 * Returns friends sorted by XP descending.
 */
export async function getFriends(): Promise<FriendDTO[]> {
    const player = await getCurrentPlayer();
    if (!player) throw new Error("Player not found");

    const friendships = await db.friends.findMany({
        where: { player_id: player.player_id },
        include: {
            friend: {
                select: {
                    player_id: true,
                    username: true,
                    avatar: true,
                    xp: true,
                    level: true,
                    streak_days: true,
                },
            },
        },
    });

    return friendships
        .map((f) => ({
            player_id: f.friend.player_id,
            username: f.friend.username,
            avatar: f.friend.avatar,
            xp: f.friend.xp,
            level: f.friend.level,
            streak: f.friend.streak_days,
        }))
        .sort((a, b) => b.xp - a.xp);
}

/**
 * Add a friend by username.
 * Creates a bidirectional friendship (both directions).
 */
export async function addFriend(friendUsername: string): Promise<{ success: boolean; message: string }> {
    const player = await getCurrentPlayer();
    if (!player) throw new Error("Player not found");

    if (friendUsername === PLAYER_USERNAME) {
        return { success: false, message: "You cannot add yourself as a friend" };
    }

    const friendPlayer = await db.players.findUnique({
        where: { username: friendUsername },
    });

    if (!friendPlayer) {
        return { success: false, message: `Player "${friendUsername}" not found` };
    }

    // Check if already friends
    const existing = await db.friends.findFirst({
        where: {
            player_id: player.player_id,
            friend_id: friendPlayer.player_id,
        },
    });

    if (existing) {
        return { success: false, message: "Already friends" };
    }

    // Create bidirectional friendship
    await db.friends.createMany({
        data: [
            { player_id: player.player_id, friend_id: friendPlayer.player_id },
            { player_id: friendPlayer.player_id, friend_id: player.player_id },
        ],
        skipDuplicates: true,
    });

    return { success: true, message: `You are now friends with ${friendUsername}` };
}

/**
 * Remove a friend by username.
 * Removes both directions of the friendship.
 */
export async function removeFriend(friendUsername: string): Promise<{ success: boolean; message: string }> {
    const player = await getCurrentPlayer();
    if (!player) throw new Error("Player not found");

    const friendPlayer = await db.players.findUnique({
        where: { username: friendUsername },
    });

    if (!friendPlayer) {
        return { success: false, message: `Player "${friendUsername}" not found` };
    }

    // Delete both directions
    await db.friends.deleteMany({
        where: {
            OR: [
                { player_id: player.player_id, friend_id: friendPlayer.player_id },
                { player_id: friendPlayer.player_id, friend_id: player.player_id },
            ],
        },
    });

    return { success: true, message: `Removed ${friendUsername} from friends` };
}

/**
 * Get friends leaderboard: returns current player + all friends sorted by XP.
 * Used for the "Friends" tab in the Ranking/Leaderboard page.
 */
export async function getFriendsLeaderboard(): Promise<FriendsLeaderboardEntryDTO[]> {
    const player = await getCurrentPlayer();
    if (!player) throw new Error("Player not found");

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Get all friend IDs
    const friendships = await db.friends.findMany({
        where: { player_id: player.player_id },
        select: { friend_id: true },
    });
    const friendIds = friendships.map((f) => f.friend_id);

    // Fetch player + friends together sorted by xp
    const players = await db.players.findMany({
        where: {
            player_id: { in: [player.player_id, ...friendIds] },
        },
        orderBy: { xp: "desc" },
        include: {
            daily_top_messages: {
                where: { message_date: todayDate },
                take: 1,
            },
        },
    });

    return players.map((p, index) => ({
        name: p.username,
        xp: p.xp,
        level: p.level,
        streak: p.streak_days,
        guild: p.guild_name,
        avatar: p.avatar,
        rank: index + 1,
        victoryMessage: p.daily_top_messages[0]?.message,
        isMe: p.player_id === player.player_id,
    }));
}
