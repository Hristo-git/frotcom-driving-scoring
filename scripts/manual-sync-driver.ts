
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function syncDriverRange(driverId: number) {
    console.log(`Re-syncing data for driver ID ${driverId} for Feb 1 to Feb 28...`);

    // Use Sofia timezone boundaries for deletion
    const deleteRes = await pool.query(`
        DELETE FROM ecodriving_scores 
        WHERE driver_id = $1 
        AND period_start >= '2026-02-01T00:00:00+02:00' 
        AND period_start <= '2026-02-28T23:59:59+02:00'
    `, [driverId]);
    console.log(`Deleted ${deleteRes.rowCount} potentially corrupted records.`);

    for (let day = 1; day <= 28; day++) {
        const dateStr = `2026-02-${String(day).padStart(2, '0')}`;
        const start = `${dateStr}T00:00:00`;
        const end = `${dateStr}T23:59:59`;

        console.log(`Syncing ${dateStr}...`);
        await fetchAndStoreEcodriving(start, end);
    }

    console.log('Sync complete. Exiting.');
    await pool.end();
}

syncDriverRange(304);
