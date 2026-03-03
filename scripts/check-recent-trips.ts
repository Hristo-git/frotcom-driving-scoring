
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkTrips() {
    try {
        console.log('Checking trips by date...');

        const query = `
            SELECT 
                CAST(start_time AT TIME ZONE 'Europe/Sofia' AS DATE) as trip_date, 
                count(*) as trip_count
            FROM trips
            WHERE start_time >= '2026-02-26'
            GROUP BY trip_date
            ORDER BY trip_date DESC;
        `;

        const res = await pool.query(query);

        if (res.rows.length === 0) {
            console.log('No trips found for recent days.');
        } else {
            console.table(res.rows);
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await pool.end();
    }
}

checkTrips();
