
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function bulkEnrich() {
    try {
        const targetDates = ['2026-02-24', '2026-02-25'];

        for (const dateStr of targetDates) {
            console.log(`\n=== Processing date: ${dateStr} ===`);

            // Find all score rows that represent this date in Sofia time
            // We use period_start AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Sofia' to get the local date
            const scoresRes = await pool.query(`
                SELECT id, driver_id, period_start 
                FROM ecodriving_scores 
                WHERE DATE(period_start AT TIME ZONE 'Europe/Sofia') = $1
            `, [dateStr]);

            console.log(`Found ${scoresRes.rows.length} records to enrich for ${dateStr}.`);

            let updatedCount = 0;
            for (const row of scoresRes.rows) {
                // Get events for this driver on this Sofia day
                const aggRes = await pool.query(`
                    SELECT event_type, COUNT(*) as count
                    FROM ecodriving_events
                    WHERE driver_id = $1 
                      AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
                    GROUP BY event_type
                `, [row.driver_id, dateStr]);

                if (aggRes.rows.length === 0) continue;

                const eventCounts: Record<string, number> = {};
                aggRes.rows.forEach(r => {
                    eventCounts[r.event_type] = parseInt(r.count);
                });

                // Update the metrics JSONB
                await pool.query(`
                    UPDATE ecodriving_scores
                    SET metrics = metrics || jsonb_build_object('eventCounts', $1::jsonb)
                    WHERE id = $2
                `, [JSON.stringify(eventCounts), row.id]);

                updatedCount++;
            }
            console.log(`✓ Updated ${updatedCount} records for ${dateStr}.`);
        }
    } catch (err: any) {
        console.error('Bulk enrichment error:', err.message);
    } finally {
        await pool.end();
    }
}

bulkEnrich();
