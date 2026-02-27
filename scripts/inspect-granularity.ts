
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function inspectGranularity() {
    try {
        console.log('Checking for non-daily records...');
        // Check for records that are longer than 25 hours
        const res = await pool.query(
            `SELECT 
                period_start, 
                period_end, 
                period_end - period_start as duration,
                count(*) 
             FROM ecodriving_scores 
             GROUP BY period_start, period_end, duration
             ORDER BY period_start DESC
             LIMIT 20`
        );

        console.log('Records grouped by period:', res.rows);

        const nonDaily = res.rows.filter((r: any) => {
            // Check if duration is roughly 1 day (allow slight variance/DST)
            // '1 day' interval usually comes back as { days: 1 } or similar depending on driver
            // But let's look at the output string first.
            return false; // Just printing for now
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

inspectGranularity();
