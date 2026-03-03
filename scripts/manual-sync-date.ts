
import { syncDriversAndVehicles } from '../lib/sync';
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import { fetchAndStoreEcodrivingEvents } from '../lib/ecodriving-events';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function manualSync(targetDate: string) {
    const start = `${targetDate}T00:00:00`;
    const end = `${targetDate}T23:59:59`;

    console.log(`Manual Sync for ${targetDate}`);
    console.log(`Period: ${start} → ${end}`);

    try {
        console.log('\n[1/3] Syncing drivers & vehicles...');
        await syncDriversAndVehicles();

        console.log('\n[2/3] Fetching ecodriving scores...');
        await fetchAndStoreEcodriving(start, end);

        console.log('\n[3/3] Fetching granular driving events...');
        const evResult = await fetchAndStoreEcodrivingEvents(start, end);
        console.log(`  Events: fetched=${evResult.fetched}, stored=${evResult.stored}, errors=${evResult.errors}`);

        console.log('\n✅ Manual sync complete.');
    } catch (err) {
        console.error('\n❌ Manual sync FAILED:', err);
    } finally {
        await pool.end();
    }
}

const target = process.argv[2] || '2026-03-01';
manualSync(target);
