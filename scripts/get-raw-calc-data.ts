
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function getStats(driverId: number) {
    const res = await pool.query(`
        SELECT 
            period_start::date as date,
            overall_score,
            (metrics->>'mileage')::numeric as mileage
        FROM ecodriving_scores
        WHERE driver_id = $1
          AND period_start >= '2026-02-01'
          AND period_end <= '2026-02-28 23:59:59'
        ORDER BY period_start
    `, [driverId]);
    return res.rows;
}

async function main() {
    const t = await getStats(360); // Trajkovski
    const s = await getStats(361); // Stefanovski

    console.log("TRAJKOVSKI_DATA");
    t.forEach(r => console.log(`${r.date.toISOString().split('T')[0]},${r.overall_score},${r.mileage}`));

    console.log("STEFANOVSKI_DATA");
    s.forEach(r => console.log(`${r.date.toISOString().split('T')[0]},${r.overall_score},${r.mileage}`));

    await pool.end();
}

main();
