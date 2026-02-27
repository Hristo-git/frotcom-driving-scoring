
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function verifyAndFixEnrichment() {
    try {
        const drivers = [
            { id: 283, name: 'Hristo Tsvetev' },
            { id: 312, name: 'Vladimir Iliev' }
        ];
        const day = '2026-02-25';

        for (const dr of drivers) {
            console.log(`\n--- Verification for ${dr.name} (ID: ${dr.id}) ---`);

            // 1. Get Events
            const aggRes = await pool.query(`
                SELECT event_type, COUNT(*) as count, SUM(duration_sec) as total_sec
                FROM ecodriving_events
                WHERE driver_id = $1 AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
                GROUP BY event_type
            `, [dr.id, day]);

            if (aggRes.rows.length === 0) {
                console.log(`No events found.`);
                continue;
            }

            const eventCounts = {};
            aggRes.rows.forEach(r => eventCounts[r.event_type] = parseInt(r.count));

            // 2. Find the score row
            const scoreRowRes = await pool.query(`
                SELECT id, period_start, metrics 
                FROM ecodriving_scores 
                WHERE driver_id = $1 AND DATE(period_start AT TIME ZONE 'Europe/Sofia') = $2
            `, [dr.id, day]);

            if (scoreRowRes.rows.length === 0) {
                console.log(`No scoring record found.`);
                continue;
            }

            const scoreRow = scoreRowRes.rows[0];
            console.log(`Found score row ID ${scoreRow.id} with score ${scoreRow.metrics.score}`);

            // 3. Update with forced ID
            const upRes = await pool.query(`
                UPDATE ecodriving_scores
                SET metrics = metrics || jsonb_build_object('eventCounts', $1::jsonb)
                WHERE id = $2
            `, [JSON.stringify(eventCounts), scoreRow.id]);

            console.log(`Rows updated: ${upRes.rowCount}`);

            // 4. Double check
            const finalCheck = await pool.query(`SELECT metrics->'eventCounts' as counts FROM ecodriving_scores WHERE id = $1`, [scoreRow.id]);
            console.log(`Final eventCounts:`, finalCheck.rows[0].counts);
        }
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
verifyAndFixEnrichment();
