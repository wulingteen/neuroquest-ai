import { NextResponse } from "next/server";
import { getProfileOptions } from "@/lib/services/user.service";

/**
 * GET /api/user/profile/options
 *
 * Returns all profile options grouped by category.
 * Used by the ProfileSetupModal to render the selection UI.
 */
export async function GET() {
    try {
        const { backgrounds, interests } = await getProfileOptions();
        return NextResponse.json({ success: true, backgrounds, interests });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching profile options:", error);
        return NextResponse.json(
            { success: false, error: `Failed to fetch profile options: ${msg}` },
            { status: 500 },
        );
    }
}
