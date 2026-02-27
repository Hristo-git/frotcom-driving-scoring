
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkData() {
    const start = '2026-02-04T00:00:00';
    const end = '2026-02-10T23:59:59';

    console.log(`Checking data from ${start} to ${end}...`);

    try {
        const res = await pool.query(
            `SELECT COUNT(*) as count, MIN(period_start) as min_start, MAX(period_end) as max_end 
             FROM ecodriving_scores 
             WHERE period_start >= $1 AND period_end <= $2`,
            [start, end]
        );

        console.log('Result:', res.rows[0]);

        if (parseInt(res.rows[0].count) === 0) {
            console.log('No data found for this period.');
        } else {
            console.log(`Found ${res.rows[0].count} records.`);
        }

    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        // Pool will keep the process alive, so we explicitly exit for this script
        process.exit(0);
    }
}

checkData();
