
import { syncDriversAndVehicles } from '../lib/sync';
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import { fetchAndStoreEcodrivingEvents } from '../lib/ecodriving-events';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function syncForDate(dateStr: string) {
    const start = `${dateStr}T00:00:00`;
    const end = `${dateStr}T23:59:59`;

    console.log(`\n--- Processing Date: ${dateStr} ---`);
    console.log(`Period: ${start} → ${end}`);

    try {
        console.log('  [1/2] Fetching ecodriving scores...');
        await fetchAndStoreEcodriving(start, end);

        console.log('  [2/2] Fetching granular driving events...');
        const evResult = await fetchAndStoreEcodrivingEvents(start, end);
        console.log(`    Events: fetched=${evResult.fetched}, stored=${evResult.stored}`);
    } catch (err) {
        console.error(`  FAILED for ${dateStr}:`, err);
    }
}

async function backfill() {
    // Backfill from Feb 20 to March 3
    const dates = [];
    let curr = new Date('2026-02-20');
    const stop = new Date('2026-03-03');

    while (curr <= stop) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }

    console.log(`Backfilling ${dates.length} days...`);
    for (const date of dates) {
        await syncForDate(date);
    }
    await pool.end();
}

backfill();
