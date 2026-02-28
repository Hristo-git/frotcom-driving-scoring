import { syncDriversAndVehicles } from '../lib/sync';
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import { fetchAndStoreEcodrivingEvents } from '../lib/ecodriving-events';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function manualSync() {
    const targetDate = '2026-02-27';
    const start = `${targetDate}T00:00:00`;
    const end = `${targetDate}T23:59:59`;

    console.log(`Manual sync for ${targetDate}...`);
    try {
        await syncDriversAndVehicles();
        console.log('Fetching scores...');
        await fetchAndStoreEcodriving(start, end);
        console.log('Fetching events...');
        await fetchAndStoreEcodrivingEvents(start, end);
        console.log('Sync complete.');
    } catch (err) {
        console.error('Manual sync failed:', err);
    } finally {
        await pool.end();
    }
}

manualSync();
