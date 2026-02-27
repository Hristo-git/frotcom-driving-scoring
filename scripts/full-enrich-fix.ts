
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function fullEnrich() {
    try {
        const targetDates = ['2026-02-24', '2026-02-25'];
        for (const date of targetDates) {
            console.log(`Enriching all drivers for ${date}...`);
            const scoresRes = await pool.query(`
                SELECT DISTINCT driver_id,
                       DATE(period_start AT TIME ZONE 'Europe/Sofia') AS day
                FROM ecodriving_scores
                WHERE CAST(period_start AS DATE) = $1
            `, [date]);

            console.log(`Found ${scoresRes.rows.length} scoring records for ${date}.`);

            for (const row of scoresRes.rows) {
                const aggRes = await pool.query(`
                    SELECT
                        event_type,
                        COUNT(*)                AS count,
                        COALESCE(SUM(duration_sec), 0) AS total_sec
                    FROM ecodriving_events
                    WHERE driver_id = $1
                      AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
                    GROUP BY event_type
                `, [row.driver_id, row.day]);

                if (aggRes.rows.length === 0) continue;

                const eventCounts: Record<string, number> = {};
                const eventDurations: Record<string, number> = {};
                for (const ev of aggRes.rows) {
                    eventCounts[ev.event_type] = parseInt(ev.count);
                    if (parseInt(ev.total_sec) > 0) {
                        eventDurations[ev.event_type] = parseInt(ev.total_sec);
                    }
                }

                await pool.query(`
                    UPDATE ecodriving_scores
                    SET metrics = metrics || jsonb_build_object(
                        'eventCounts', $1::jsonb,
                        'eventDurations', $2::jsonb
                    )
                    WHERE driver_id = $3
                      AND DATE(period_start AT TIME ZONE 'Europe/Sofia') = $4
                `, [
                    JSON.stringify(eventCounts),
                    JSON.stringify(eventDurations),
                    row.driver_id,
                    row.day
                ]);
            }
            console.log(`✓ Completed enrichment for ${date}.`);
        }
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
fullEnrich();
