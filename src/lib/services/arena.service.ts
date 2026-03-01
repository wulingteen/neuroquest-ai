import db from "@/lib/db";

export interface ArenaChallengeDTO {
    id: string;
    title: string | null;
    description: string | null;
    difficulty: string | null;
    examples: unknown;
}

export async function getAllChallenges(): Promise<ArenaChallengeDTO[]> {
    const raw = await db.arena_challenges.findMany({
        orderBy: { created_at: "asc" },
    });

    return raw.map((c) => ({
        id: c.challenge_id,
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        examples: c.example_prompts,
    }));
}
