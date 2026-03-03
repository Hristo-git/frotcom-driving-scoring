
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkKostadinEvents() {
    try {
        const eventsRes = await pool.query(
            `SELECT DATE(started_at) as day, COUNT(*) as ev_count, SUM(duration_sec) as total_duration
             FROM ecodriving_events
             WHERE driver_id = 304 AND started_at >= '2026-03-02'
             GROUP BY DATE(started_at)
             ORDER BY day ASC`
        );
        console.log(`Kostadin has events on ${eventsRes.rowCount} days in Feb.`);
        for (const row of eventsRes.rows) {
            console.log(`  ${new Date(row.day).toISOString().split('T')[0]}: ${row.ev_count} events, ${row.total_duration}s`);
        }
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
checkKostadinEvents();
