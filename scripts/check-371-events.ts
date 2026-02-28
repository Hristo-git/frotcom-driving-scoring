import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkEvents() {
    try {
        const query = `
            SELECT count(*) 
            FROM ecodriving_events 
            WHERE driver_id = 371 
              AND DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = '2026-02-27'
        `;
        const { rows } = await pool.query(query);
        console.log('Event count for 371 on Feb 27:', rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkEvents();
