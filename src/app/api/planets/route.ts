import { NextResponse } from 'next/server';
import { PLANETS } from '@/lib/gameData';
import { createClient } from '@/lib/supabase/server';

// GET /api/planets
export async function GET() {
    try {
        // 1. In the fully implemented DB architecture, fetch from Supabase:
        // const supabase = await createClient();
        // const { data, error } = await supabase.from('planets').select('*');
        // if (error) throw error;

        // 2. Currently falling back to static data for demonstration of separation
        const data = PLANETS;

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('Error fetching planets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch planets' },
            { status: 500 }
        );
    }
}
