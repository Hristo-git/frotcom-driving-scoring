
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkEvents() {
    try {
        console.log('Checking ecodriving_events by date...');

        const query = `
            SELECT 
                DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as event_date, 
                count(*) as event_count
            FROM ecodriving_events
            WHERE started_at >= '2026-02-26'
            GROUP BY event_date
            ORDER BY event_date DESC;
        `;

        const res = await pool.query(query);

        if (res.rows.length === 0) {
            console.log('No events found for recent days.');
        } else {
            console.table(res.rows);
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await pool.end();
    }
}

checkEvents();
