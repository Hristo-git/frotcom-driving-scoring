
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function pinpointUpdate() {
    try {
        const targetScores = [
            { id: 39372, driver: 'Hristo Tsvetev' },
            { id: 39503, driver: 'Vladimir Iliev' }
        ];

        for (const ts of targetScores) {
            console.log(`Updating ${ts.driver} (Record ID ${ts.id})...`);
            const scoreRes = await pool.query(`SELECT driver_id, period_start FROM ecodriving_scores WHERE id = $1`, [ts.id]);
            const { driver_id, period_start } = scoreRes.rows[0];
            const dateRes = await pool.query(`SELECT DATE($1 AT TIME ZONE 'Europe/Sofia') as day`, [period_start]);
            const sofiaDay = dateRes.rows[0].day;

            const aggRes = await pool.query(`
                SELECT event_type, COUNT(*) as count
                FROM ecodriving_events
                WHERE driver_id = $1 AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
                GROUP BY event_type
            `, [driver_id, sofiaDay]);

            if (aggRes.rows.length === 0) continue;

            const eventCounts: Record<string, number> = {};
            aggRes.rows.forEach(r => {
                eventCounts[r.event_type] = parseInt(r.count);
            });

            await pool.query(`
                UPDATE ecodriving_scores
                SET metrics = metrics || jsonb_build_object('eventCounts', $1::jsonb)
                WHERE id = $2
            `, [JSON.stringify(eventCounts), ts.id]);

            console.log(`Success! Updated record ${ts.id}`);
        }
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
pinpointUpdate();
