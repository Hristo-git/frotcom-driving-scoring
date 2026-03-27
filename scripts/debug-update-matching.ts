
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugUpdate() {
    try {
        const driverId = 342;
        const res = await pool.query(`
            SELECT 
                es.period_start,
                DATE(es.period_start AT TIME ZONE 'Europe/Sofia') as es_date,
                ea.event_date,
                ea.event_counts
            FROM ecodriving_scores es
            LEFT JOIN (
                SELECT 
                    driver_id,
                    edate as event_date,
                    jsonb_object_agg(event_type, count) as event_counts
                FROM (
                    SELECT 
                        driver_id, 
                        DATE(started_at AT TIME ZONE 'Europe/Sofia') as edate, 
                        event_type, 
                        count(*) as count
                    FROM ecodriving_events
                    WHERE driver_id = $1
                    GROUP BY driver_id, edate, event_type
                ) sub
                GROUP BY driver_id, event_date
            ) ea ON es.driver_id = ea.driver_id 
              AND DATE(es.period_start AT TIME ZONE 'Europe/Sofia') = ea.event_date
            WHERE es.driver_id = $1
            ORDER BY es.period_start ASC
        `, [driverId]);
        
        res.rows.forEach(r => {
            console.log(`ScoreDate: ${r.es_date} | EventDate: ${r.event_date} | Matches: ${r.es_date && r.event_date && r.es_date.toISOString().split('T')[0] === r.event_date.toISOString().split('T')[0]}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugUpdate();
