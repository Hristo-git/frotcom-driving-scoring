
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixCounts() {
    try {
        const driverId = 342;
        const start = '2026-03-01';
        const end = '2026-03-15';

        console.log(`Aggregating events for Nikolai between ${start} and ${end}...`);
        
        const aggRes = await pool.query(`
            SELECT 
                edate,
                jsonb_object_agg(event_type, count) as event_counts
            FROM (
                SELECT 
                    DATE(started_at AT TIME ZONE 'Europe/Sofia') as edate, 
                    event_type, 
                    count(*) as count
                FROM ecodriving_events
                WHERE driver_id = $1
                  AND started_at >= '2026-02-28T22:00:00Z'
                  AND started_at <= '2026-03-16T22:00:00Z'
                GROUP BY edate, event_type
            ) sub
            GROUP BY edate
        `, [driverId]);

        console.log(`Found aggregation for ${aggRes.rows.length} days.`);

        for (const row of aggRes.rows) {
            const dateStr = row.edate.toISOString().split('T')[0];
            process.stdout.write(`Updating day ${dateStr} for Nikolai ... `);
            
            const updateRes = await pool.query(`
                UPDATE ecodriving_scores 
                SET metrics = metrics || jsonb_build_object('eventCounts', $1::jsonb)
                WHERE driver_id = $2
                  AND DATE(period_start AT TIME ZONE 'Europe/Sofia') = $3
                RETURNING id
            `, [JSON.stringify(row.event_counts), driverId, dateStr]);
            
            console.log(`${updateRes.rowCount} rows updated.`);
        }

        console.log('Update complete.');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

fixCounts();
