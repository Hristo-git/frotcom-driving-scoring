
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const res = await pool.query(`
        SELECT COUNT(*) as count
        FROM ecodriving_events
        WHERE started_at >= '2026-02-01'
          AND started_at <= '2026-02-28 23:59:59'
    `);
    console.log('Total February Events:', res.rows[0].count);

    if (parseInt(res.rows[0].count) > 0) {
        const drivers = await pool.query(`
            SELECT d.name, COUNT(e.id) as event_count
            FROM ecodriving_events e
            JOIN drivers d ON e.driver_id = d.id
            WHERE e.started_at >= '2026-02-01'
              AND e.started_at <= '2026-02-28 23:59:59'
            GROUP BY d.name
        `);
        console.table(drivers.rows);
    }

    await pool.end();
}

main();
