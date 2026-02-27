
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function targetedEnrich() {
    try {
        const driverIds = [283, 312];
        const day = '2026-02-25';

        for (const driverId of driverIds) {
            console.log(`Processing Driver ${driverId} for ${day}...`);
            const aggRes = await pool.query(`
                SELECT
                    event_type,
                    COUNT(*)                AS count,
                    COALESCE(SUM(duration_sec), 0) AS total_sec
                FROM ecodriving_events
                WHERE driver_id = $1
                  AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
                GROUP BY event_type
            `, [driverId, day]);

            if (aggRes.rows.length === 0) {
                console.log(`No events found in ecodriving_events for Driver ${driverId} on ${day}.`);
                continue;
            }

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
                driverId,
                day
            ]);
            console.log(`Updated Driver ${driverId} with ${aggRes.rows.length} event types.`);
        }
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
targetedEnrich();
