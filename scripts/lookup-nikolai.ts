
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findNikolai() {
    try {
        const name = 'Николай Красимиров Костадинов';
        console.log(`Searching for: ${name}`);
        
        const res = await pool.query(
            "SELECT id, name FROM drivers WHERE name ILIKE $1",
            [`%${name}%`]
        );
        
        console.log('Found drivers:', res.rows);
        
        if (res.rows.length > 0) {
            const driverId = res.rows[0].id;
            const start = '2026-03-01';
            const end = '2026-03-15';
            
            const scores = await pool.query(
                `SELECT period_start, period_end, overall_score, metrics 
                 FROM ecodriving_scores 
                 WHERE driver_id = $1 AND period_start >= $2 AND period_end <= $3 
                 ORDER BY period_start ASC`,
                [driverId, start, end]
            );
            
            console.log(`Found ${scores.rows.length} score entries for the period.`);
            
            let totalDist = 0;
            scores.rows.forEach(r => {
                const dist = parseFloat(r.metrics?.mileage) || 0;
                totalDist += dist;
                console.log(`${r.period_start.toISOString().split('T')[0]} - ${r.period_end.toISOString().split('T')[0]} | Dist: ${dist.toFixed(1)} | Score: ${r.overall_score}`);
                if (r.metrics) {
                    console.log(`\n--- Metrics for ${r.period_start.toISOString().split('T')[0]} ---`);
                    console.log(JSON.stringify(r.metrics, null, 2));
                }
            });
            
            console.log(`Total Distance calculated: ${totalDist.toFixed(1)} km`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findNikolai();
