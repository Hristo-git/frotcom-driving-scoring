
import { NextRequest, NextResponse } from 'next/server';
import { syncDriversAndVehicles } from '../../../../../lib/sync';
import { fetchAndStoreEcodriving, fetchAndStorePeriodScores } from '../../../../../lib/ecodriving';
import { fetchAndStoreEcodrivingEvents } from '../../../../../lib/ecodriving-events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('[Cron] Starting automated sync at', new Date().toISOString());

        // Get current date in Sofia (YYYY-MM-DD)
        const now = new Date();
        const sofiaDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Sofia',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(now);

        console.log(`[Cron] Syncing for date: ${sofiaDate}`);

        // 1. Sync Drivers and Vehicles
        console.log('[Cron] Step 1: Syncing metadata...');
        await syncDriversAndVehicles();

        // 2. Sync Ecodriving Scores (today)
        console.log('[Cron] Step 2: Fetching scores...');
        await fetchAndStoreEcodriving(sofiaDate, sofiaDate);

        // 3. Sync Ecodriving Events (today)
        console.log('[Cron] Step 3: Fetching events...');
        const eventResult = await fetchAndStoreEcodrivingEvents(
            `${sofiaDate}T00:00:00`,
            `${sofiaDate}T23:59:59`
        );
        console.log(`[Cron] Events sync finished: ${eventResult.stored} stored.`);

        // 4. Sync period-level scores (month-to-date) — exact Frotcom period scores
        // so the dashboard fallback path reads accurate cached values instead of
        // aggregating daily rows (which diverges due to non-linear scoring).
        const monthStart = sofiaDate.substring(0, 8) + '01'; // e.g. 2026-03-01
        console.log(`[Cron] Step 4: Fetching period scores ${monthStart} → ${sofiaDate}`);
        await fetchAndStorePeriodScores(monthStart, sofiaDate);

        return NextResponse.json({
            success: true,
            date: sofiaDate,
            events: eventResult
        });
    } catch (error: any) {
        console.error('[Cron] Sync failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
