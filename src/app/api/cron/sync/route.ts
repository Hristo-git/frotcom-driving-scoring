
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

        // Get current date and yesterday's date in Sofia timezone (YYYY-MM-DD)
        const now = new Date();
        const dateOpts: Intl.DateTimeFormatOptions = {
            timeZone: 'Europe/Sofia',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };
        const sofiaToday = new Intl.DateTimeFormat('en-CA', dateOpts).format(now);

        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sofiaYesterday = new Intl.DateTimeFormat('en-CA', dateOpts).format(yesterday);

        console.log(`[Cron] Sofia today: ${sofiaToday}, yesterday: ${sofiaYesterday}`);

        // 1. Sync Drivers and Vehicles
        console.log('[Cron] Step 1: Syncing metadata...');
        await syncDriversAndVehicles();

        // 2. Sync Ecodriving Scores (yesterday — complete day)
        console.log(`[Cron] Step 2: Fetching daily scores for ${sofiaYesterday}...`);
        await fetchAndStoreEcodriving(sofiaYesterday, sofiaYesterday);

        // 3. Sync Ecodriving Events (yesterday)
        console.log(`[Cron] Step 3: Fetching events for ${sofiaYesterday}...`);
        const eventResult = await fetchAndStoreEcodrivingEvents(
            `${sofiaYesterday}T00:00:00`,
            `${sofiaYesterday}T23:59:59`
        );
        console.log(`[Cron] Events sync finished: ${eventResult.stored} stored.`);

        // 4. Sync period-level scores (month-to-date) — exact Frotcom period scores
        // so the dashboard fallback path reads accurate cached values instead of
        // aggregating daily rows (which diverges due to non-linear scoring).
        const monthStart = sofiaToday.substring(0, 8) + '01'; // e.g. 2026-04-01
        console.log(`[Cron] Step 4: Fetching period scores ${monthStart} → ${sofiaToday}`);
        await fetchAndStorePeriodScores(monthStart, sofiaToday);

        return NextResponse.json({
            success: true,
            dailyDate: sofiaYesterday,
            periodEnd: sofiaToday,
            events: eventResult
        });
    } catch (error: any) {
        console.error('[Cron] Sync failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
