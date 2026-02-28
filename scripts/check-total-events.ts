import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkTotalEvents() {
    try {
        const query = `
            SELECT count(*) 
            FROM ecodriving_events 
            WHERE DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = '2026-02-27'
        `;
        const { rows } = await pool.query(query);
        console.log('Total events for Feb 27:', rows[0].count);

        const typeQuery = `
            SELECT event_type, count(*) 
            FROM ecodriving_events 
            WHERE DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = '2026-02-27'
            GROUP BY event_type
            ORDER BY count DESC
        `;
        const typeRows = await pool.query(typeQuery);
        console.log('\nEvents by type:');
        console.table(typeRows.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkTotalEvents();
