import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixEnrichment() {
    console.log('\n=== RE-AGGREGATING EVENTS FOR FEB 24 - FEB 26 ===\n');

    // Get all driver/day combinations in ecodriving_scores for the affected range
    // Get all driver/day combinations in ecodriving_scores for the affected range
    const scoresRes = await pool.query(`
        SELECT DISTINCT driver_id,
               TO_CHAR((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia', 'YYYY-MM-DD') AS day_str
        FROM ecodriving_scores
        WHERE DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') BETWEEN '2026-02-24' AND '2026-02-27'
    `);
    console.log(`Updating ${scoresRes.rows.length} driver-day combinations...`);

    let updated = 0;
    for (const row of scoresRes.rows) {
        const dayStr = row.day_str;

        // Aggregate events for this driver on this day (Sofia)
        // Note: started_at is timestamp without time zone, assumed UTC in DB
        const aggRes = await pool.query(`
            SELECT
                event_type,
                COUNT(*)                AS count,
                COALESCE(SUM(duration_sec), 0) AS total_sec
            FROM ecodriving_events
            WHERE driver_id = $1
              AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
            GROUP BY event_type
        `, [row.driver_id, dayStr]);

        // Build eventCounts map
        const eventCounts: Record<string, number> = {};
        const eventDurations: Record<string, number> = {};
        for (const ev of aggRes.rows) {
            eventCounts[ev.event_type] = parseInt(ev.count);
            if (parseInt(ev.total_sec) > 0) {
                eventDurations[ev.event_type] = parseInt(ev.total_sec);
            }
        }

        // Update ecodriving_scores
        await pool.query(`
            UPDATE ecodriving_scores
            SET metrics = metrics || jsonb_build_object(
                'eventCounts', $1::jsonb,
                'eventDurations', $2::jsonb
            )
            WHERE driver_id = $3
              AND DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = $4
        `, [
            JSON.stringify(eventCounts),
            JSON.stringify(eventDurations),
            row.driver_id,
            dayStr
        ]);
        updated++;
    }

    console.log(`✓ successfully corrected ${updated} ecodriving_scores records.`);
    await pool.end();
}

fixEnrichment().catch(console.error);
