import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkKrasimir() {
    try {
        const query = `
            SELECT period_start, period_end, overall_score, metrics 
            FROM ecodriving_scores 
            WHERE driver_id = 371 
            ORDER BY period_start DESC 
            LIMIT 10
        `;
        const { rows } = await pool.query(query);
        rows.forEach(r => {
            console.log(`\nPeriod: ${r.period_start} to ${r.period_end}`);
            console.log(`Score: ${r.overall_score}`);
            console.log(`Metrics: ${JSON.stringify(r.metrics, null, 2)}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkKrasimir();
