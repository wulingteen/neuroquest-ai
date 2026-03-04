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

export interface FriendRequestDTO {
    request_id: string;
    requester_id: string;
    requester_username: string | null;
    requester_avatar: string | null;
    created_at: string;
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
 * List all confirmed friends of the current player (YouPlayer).
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
 * Send a friend request from YouPlayer to the given username.
 * Does NOT create a friendship immediately — the other party must accept.
 * Replaces the old "instant add" behaviour.
 */
export async function sendFriendRequest(friendUsername: string): Promise<{ success: boolean; message: string }> {
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

    // Already friends?
    const alreadyFriends = await db.friends.findFirst({
        where: {
            player_id: player.player_id,
            friend_id: friendPlayer.player_id,
        },
    });
    if (alreadyFriends) {
        return { success: false, message: "Already friends" };
    }

    // Pending request already sent?
    const existingOutgoing = await db.friend_requests.findFirst({
        where: {
            requester_id: player.player_id,
            requestee_id: friendPlayer.player_id,
            status: "pending",
        },
    });
    if (existingOutgoing) {
        return { success: false, message: "Friend request already sent" };
    }

    // They already sent us a request? Auto-accept it.
    const incomingRequest = await db.friend_requests.findFirst({
        where: {
            requester_id: friendPlayer.player_id,
            requestee_id: player.player_id,
            status: "pending",
        },
    });
    if (incomingRequest) {
        return acceptFriendRequest(incomingRequest.request_id.toString());
    }

    // Create the pending request
    await db.friend_requests.create({
        data: {
            requester_id: player.player_id,
            requestee_id: friendPlayer.player_id,
            status: "pending",
        },
    });

    return { success: true, message: `Friend request sent to ${friendUsername}` };
}

/**
 * Get all pending friend requests sent TO the current player (YouPlayer).
 */
export async function getPendingFriendRequests(): Promise<FriendRequestDTO[]> {
    const player = await getCurrentPlayer();
    if (!player) throw new Error("Player not found");

    const requests = await db.friend_requests.findMany({
        where: {
            requestee_id: player.player_id,
            status: "pending",
        },
        include: {
            requester: {
                select: {
                    player_id: true,
                    username: true,
                    avatar: true,
                },
            },
        },
        orderBy: { created_at: "asc" },
    });

    return requests.map((r) => ({
        request_id: r.request_id.toString(),
        requester_id: r.requester_id,
        requester_username: r.requester.username,
        requester_avatar: r.requester.avatar,
        created_at: r.created_at.toISOString(),
    }));
}

/**
 * Accept a pending friend request.
 * Creates bidirectional friendship and marks request as accepted.
 */
export async function acceptFriendRequest(requestId: string): Promise<{ success: boolean; message: string }> {
    const player = await getCurrentPlayer();
    if (!player) throw new Error("Player not found");

    const request = await db.friend_requests.findUnique({
        where: { request_id: BigInt(requestId) },
    });

    if (!request || request.status !== "pending") {
        return { success: false, message: "Friend request not found or already handled" };
    }

    if (request.requestee_id !== player.player_id) {
        return { success: false, message: "Not authorized to accept this request" };
    }

    // Create bidirectional friendship
    await db.$transaction([
        db.friends.createMany({
            data: [
                { player_id: request.requestee_id, friend_id: request.requester_id },
                { player_id: request.requester_id, friend_id: request.requestee_id },
            ],
            skipDuplicates: true,
        }),
        db.friend_requests.update({
            where: { request_id: BigInt(requestId) },
            data: { status: "accepted", updated_at: new Date() },
        }),
    ]);

    const requester = await db.players.findUnique({
        where: { player_id: request.requester_id },
        select: { username: true },
    });

    return { success: true, message: `You are now friends with ${requester?.username ?? "them"}` };
}

/**
 * Decline a pending friend request.
 */
export async function declineFriendRequest(requestId: string): Promise<{ success: boolean; message: string }> {
    const player = await getCurrentPlayer();
    if (!player) throw new Error("Player not found");

    const request = await db.friend_requests.findUnique({
        where: { request_id: BigInt(requestId) },
    });

    if (!request || request.status !== "pending") {
        return { success: false, message: "Friend request not found or already handled" };
    }

    if (request.requestee_id !== player.player_id) {
        return { success: false, message: "Not authorized to decline this request" };
    }

    await db.friend_requests.update({
        where: { request_id: BigInt(requestId) },
        data: { status: "declined", updated_at: new Date() },
    });

    return { success: true, message: "Friend request declined" };
}

/**
 * Remove a confirmed friend by username.
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
