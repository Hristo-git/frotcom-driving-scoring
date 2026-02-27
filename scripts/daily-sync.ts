/**
 * Daily sync script — captures today's ecodriving data from Frotcom.
 *
 * Run this at 23:50 each day (Windows Task Scheduler).
 *
 * Steps:
 *  1. Sync driver & vehicle roster from Frotcom.
 *  2. Fetch daily ecodriving SCORES (overall metrics per driver per day).
 *  3. Fetch granular driving EVENTS (harsh braking, acceleration, idling…)
 *     via GET /v2/ecodriving/events/{vid}/{did}?df=&dt= — this endpoint
 *     DOES support historical date filtering via UTC df/dt params.  ✅
 *
 * Schedule: Task Scheduler → daily at 23:50 Sofia time.
 * Log:      logs/daily-sync.log
 */
import { syncDriversAndVehicles } from '../lib/sync';
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import { fetchAndStoreEcodrivingEvents } from '../lib/ecodriving-events';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/** Returns today's date string in Sofia timezone, e.g. "2026-02-22" */
function getTodaySofia(): string {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Sofia',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

async function main() {
    const today = getTodaySofia();
    const start = `${today}T00:00:00`;
    const end = `${today}T23:59:59`;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Daily Frotcom Sync — ${today}`);
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log(`Period: ${start} → ${end}`);
    console.log('='.repeat(60));

    try {
        // Step 1: Refresh driver & vehicle roster
        console.log('\n[1/3] Syncing drivers & vehicles...');
        await syncDriversAndVehicles();

        // Step 2: Fetch and store today's ecodriving scores (aggregate per driver)
        console.log('\n[2/3] Fetching ecodriving scores...');
        await fetchAndStoreEcodriving(start, end);

        // Step 3: Fetch and store granular driving behavior events
        // NOTE: /v2/ecodriving/events uses df/dt UTC params and DOES support historical dates.
        console.log('\n[3/3] Fetching granular driving events...');
        const evResult = await fetchAndStoreEcodrivingEvents(start, end);
        console.log(`  Events: fetched=${evResult.fetched}, stored=${evResult.stored}, errors=${evResult.errors}`);

        console.log(`\n✅ Daily sync complete. ${new Date().toISOString()}`);
    } catch (err) {
        console.error('\n❌ Daily sync FAILED:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
