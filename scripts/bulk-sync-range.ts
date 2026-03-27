
import { syncDriversAndVehicles } from '../lib/sync';
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import { fetchAndStoreEcodrivingEvents } from '../lib/ecodriving-events';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function bulkSync(startStr: string, endStr: string) {
    console.log(`Bulk Sync Range: ${startStr} to ${endStr}`);

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    try {
        console.log('\n[1/1] Syncing global metadata (drivers & vehicles)...');
        await syncDriversAndVehicles();

        let current = new Date(startDate);
        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            const dayStart = `${dateStr}T00:00:00`;
            const dayEnd = `${dateStr}T23:59:59`;

            console.log(`\n--- Processing ${dateStr} ---`);
            
            try {
                console.log(`[Ecodriving] Fetching and storing...`);
                await fetchAndStoreEcodriving(dayStart, dayEnd);

                console.log(`[Events] Fetching and storing...`);
                const evResult = await fetchAndStoreEcodrivingEvents(dayStart, dayEnd);
                console.log(`  Events: fetched=${evResult.fetched}, stored=${evResult.stored}, errors=${evResult.errors}`);
            } catch (dayErr) {
                console.error(`\n❌ Error processing ${dateStr}:`, dayErr);
                // Continue to next day
            }

            current.setDate(current.getDate() + 1);
        }

        console.log('\n✅ Bulk sync complete.');
    } catch (err) {
        console.error('\n❌ Bulk sync FAILED:', err);
    } finally {
        await pool.end();
    }
}

const start = process.argv[2] || '2026-03-01';
const end = process.argv[3] || '2026-03-14';

bulkSync(start, end);
