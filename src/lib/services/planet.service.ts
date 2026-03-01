import db from "@/lib/db";

export interface PlanetDTO {
    id: string;
    name: string;
    subtitle: string | null;
    icon: string | null;
    color: string | null;
    glowColor: string | null;
    bgGradient: string | null;
    x: number | null;
    y: number | null;
    totalLevels: number;
    description: string | null;
    requiredPlanet: string | null;
}

export async function getAllPlanets(): Promise<PlanetDTO[]> {
    const planets = await db.planets.findMany({
        include: {
            _count: {
                select: { levels: true },
            },
        },
        orderBy: { created_at: "asc" },
    });

    return planets.map((p) => ({
        id: p.rollup,
        name: p.label,
        subtitle: p.subtitle,
        icon: p.icon,
        color: p.color,
        glowColor: p.glow_color,
        bgGradient: p.bg_gradient,
        x: p.x,
        y: p.y,
        totalLevels: p._count.levels,
        description: p.description,
        requiredPlanet: p.required_rollup,
    }));
}
