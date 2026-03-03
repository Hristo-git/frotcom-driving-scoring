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

/** Returns a Sofia-local date string (YYYY-MM-DD) for a given offset from today */
function getSofiaDate(dayOffset: number = 0): string {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Sofia',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

/** Wrapper to retry a function up to 'maxRetries' times */
async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries: number = 3): Promise<T> {
    let lastError: any;
    for (let i = 1; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            console.warn(`  [Attempt ${i}/${maxRetries}] ${label} failed:`, (err as Error).message);
            if (i < maxRetries) {
                const delay = i * 2000; // Exponential backoff: 2s, 4s...
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

async function syncForDate(dateStr: string) {
    const start = `${dateStr}T00:00:00`;
    const end = `${dateStr}T23:59:59`;

    console.log(`\n--- Processing Date: ${dateStr} ---`);
    console.log(`Period: ${start} → ${end}`);

    // Step 1: Refresh driver & vehicle roster (metadata is global, but good to refresh once per run)
    await withRetry(async () => {
        console.log('  [1/3] Syncing drivers & vehicles...');
        await syncDriversAndVehicles();
    }, `Metadata Sync (${dateStr})`);

    // Step 2: Fetch and store today's ecodriving scores (aggregate per driver)
    await withRetry(async () => {
        console.log('  [2/3] Fetching ecodriving scores...');
        await fetchAndStoreEcodriving(start, end);
    }, `Scores Sync (${dateStr})`);

    // Step 3: Fetch and store granular driving behavior events
    await withRetry(async () => {
        console.log('  [3/3] Fetching granular driving events...');
        const evResult = await fetchAndStoreEcodrivingEvents(start, end);
        console.log(`    Events: fetched=${evResult.fetched}, stored=${evResult.stored}, errors=${evResult.errors}`);
    }, `Events Sync (${dateStr})`);
}

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Robust Daily Frotcom Sync`);
    console.log(`Run started at: ${new Date().toISOString()}`);
    console.log(`='repeat(60)}\n`);

    try {
        // Sync last 3 days (Today, Yesterday, Day Before Yesterday)
        // This lookback ensures that if one run fails, the next one captures the missing data.
        const datesToSync = [0, 1, 2].map(offset => getSofiaDate(offset));

        // Reverse so we process oldest first (idempotent UPSERT makes order safe)
        for (const date of datesToSync.reverse()) {
            try {
                await syncForDate(date);
            } catch (err) {
                console.error(`\n❌ Sync FAILED for date ${date}:`, err);
                // Continue to next date even if one fails
            }
        }

        console.log(`\n✅ Robust sync sequence complete. ${new Date().toISOString()}`);
    } catch (err) {
        console.error('\n❌ Critical sync failure:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
