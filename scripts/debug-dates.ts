
import pool from '../lib/db';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugDates() {
    try {
        console.log('Checking Ecodriving Scores Granularity...');

        // Check distinct start/end periods
        const periods = await pool.query(`
            SELECT 
                period_start, 
                period_end, 
                COUNT(*) as count,
                SUM((metrics->>'mileage')::numeric) as total_distance
            FROM ecodriving_scores 
            GROUP BY period_start, period_end 
            ORDER BY period_start DESC;
        `);

        console.table(periods.rows.map(r => ({
            start: r.period_start.toISOString(),
            end: r.period_end.toISOString(),
            count: r.count,
            km: r.total_distance
        })));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

debugDates();
