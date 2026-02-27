
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function refetchDaily() {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-02-19');

    // Clean up "wide" records first to avoid confusion
    try {
        console.log('Cleaning up aggregated records...');
        await pool.query(`
            DELETE FROM ecodriving_scores 
            WHERE period_end - period_start > interval '25 hours'
            AND period_start >= '2026-01-01'
        `);
    } catch (e) {
        console.error('Error cleaning up:', e);
    }

    // Iterate day by day
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const start = `${dateStr}T00:00:00`;
        const end = `${dateStr}T23:59:59`;

        console.log(`Fetching for ${dateStr}...`);
        try {
            await fetchAndStoreEcodriving(start, end);
        } catch (error) {
            console.error(`Failed to fetch for ${dateStr}:`, error);
        }
    }

    console.log('Daily refetch complete.');
    process.exit(0);
}

refetchDaily();
