import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        // Since we don't have auth yet, we fetch the default 'YouPlayer'
        const players = await sql`
            SELECT 
                username as "playerName",
                avatar as "playerAvatar",
                xp,
                streak_days as streak,
                last_login_at as "lastLogin"
            FROM players
            WHERE username = 'YouPlayer'
            LIMIT 1
        `;

        if (players.length === 0) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const player = players[0];

        // Fetch completed levels
        const progress = await sql`
            SELECT level_id
            FROM player_progress
            WHERE player_id = (SELECT player_id FROM players WHERE username = 'YouPlayer')
        `;

        const completedLevels = progress.map(p => p.level_id);

        return NextResponse.json({
            success: true,
            data: {
                ...player,
                completedLevels,
                unlockedAchievements: ["first-step"], // Placeholder for now, could be fetched from a player_achievements table
            },
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user profile' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { xp, streak, completedLevelId } = body;

        // Update basic player stats
        if (xp !== undefined || streak !== undefined) {
            const xpValue = xp ?? null;
            const streakValue = streak ?? null;

            await sql`
                UPDATE players
                SET 
                    xp = COALESCE(${xpValue}, xp),
                    streak_days = COALESCE(${streakValue}, streak_days)
                WHERE username = 'YouPlayer'
            `;
        }

        // Add progress if a level was completed
        if (completedLevelId) {
            await sql`
                INSERT INTO player_progress (player_id, level_id)
                VALUES (
                    (SELECT player_id FROM players WHERE username = 'YouPlayer'),
                    ${completedLevelId}
                )
                ON CONFLICT (player_id, level_id) DO NOTHING
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update user profile' },
            { status: 500 }
        );
    }
}
