
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
    try {
        console.log('Checking latest data in ecodriving_scores...');
        const scoreRes = await pool.query(`
            SELECT MAX(period_start) as latest_score 
            FROM ecodriving_scores
        `);
        console.log(`Latest ecodriving_scores date: ${scoreRes.rows[0].latest_score}`);

        console.log('Checking latest data in ecodriving_events...');
        const eventRes = await pool.query(`
            SELECT MAX(started_at) as latest_event 
            FROM ecodriving_events
        `);
        console.log(`Latest ecodriving_events date: ${eventRes.rows[0].latest_event}`);
        
        console.log('Checking latest data in trips...');
        const tripRes = await pool.query(`
            SELECT MAX(start_time) as latest_trip 
            FROM trips
        `);
        console.log(`Latest trips date: ${tripRes.rows[0].latest_trip}`);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

main();
