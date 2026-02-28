import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findDriversWithEvents() {
    try {
        const query = `
            SELECT driver_id, count(*) 
            FROM ecodriving_events 
            WHERE DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = '2026-02-27'
            GROUP BY driver_id 
            ORDER BY count DESC 
            LIMIT 10
        `;
        const { rows } = await pool.query(query);
        console.log('Drivers with events on Feb 27:');
        console.table(rows);

        // Get names
        if (rows.length > 0) {
            const ids = rows.map(r => r.driver_id).join(',');
            const namesRes = await pool.query(`SELECT id, name FROM drivers WHERE id IN (${ids})`);
            console.log('\nDriver Names:');
            console.table(namesRes.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
findDriversWithEvents();
