import { fetchAndStoreEcodriving, fetchAndStorePeriodScores } from '../lib/ecodriving';
import pool from '../lib/db';

async function main() {
    console.log('Starting full cleanup and re-sync of ecodriving_scores from 2026-01-01...');

    try {
        // 1. Delete corrupted data
        const res = await pool.query(`DELETE FROM ecodriving_scores WHERE period_start >= '2026-05-01'`);
        console.log(`Deleted ${res.rowCount} corrupted records from ecodriving_scores.`);

        // 2. Generate daily ranges from 2026-01-01 to 2026-05-17
        const startDate = new Date('2026-05-01T00:00:00Z');
        const endDate = new Date('2026-05-17T00:00:00Z'); // Today

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            // Get local Sofia date in format YYYY-MM-DD
            const dateStr = new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'Europe/Sofia',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(d);

            const startOfDay = `${dateStr}T00:00:00`;
            const endOfDay = `${dateStr}T23:59:59`;

            console.log(`\n--- Fetching daily scores for ${dateStr} ---`);
            await fetchAndStoreEcodriving(startOfDay, endOfDay);
            
            // Artificial delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 3. Re-sync period summaries for full months
        console.log('\n--- Fetching period summaries for completed months ---');
        
        const periods = [
            { start: '2026-05-01T00:00:00', end: '2026-05-17T23:59:59' }
        ];

        for (const period of periods) {
            console.log(`\n--- Fetching period summary for ${period.start} to ${period.end} ---`);
            await fetchAndStorePeriodScores(period.start, period.end);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n✅ Full re-sync completed successfully.');

    } catch (err) {
        console.error('Failed to sync:', err);
    } finally {
        await pool.end();
    }
}

main();
