import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkDriver() {
    try {
        const query = `
            SELECT d.name, es.period_start, es.period_end, es.metrics, es.overall_score
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE d.name LIKE '%Красимир Боянов Александров%'
            ORDER BY es.period_start DESC
        `;
        const { rows } = await pool.query(query);
        console.log("Records for Krasimir on Feb 27:");
        if (rows.length === 0) {
            console.log("No record found for Feb 27.");
        } else {
            rows.forEach(r => {
                console.log(`\nPeriod: ${r.period_start.toISOString()} to ${r.period_end.toISOString()}`);
                console.log(`Score: ${r.overall_score}`);
                console.log(`Metrics: ${JSON.stringify(r.metrics, null, 2)}`);
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkDriver();
