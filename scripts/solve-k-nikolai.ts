
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function solveK() {
    try {
        const driverId = 342;
        const res = await pool.query(
            `SELECT 
                DATE(period_start AT TIME ZONE 'Europe/Sofia') as sdate,
                metrics->>'score' as official_score,
                metrics->'eventCounts' as counts,
                metrics->>'mileage' as dist
             FROM ecodriving_scores 
             WHERE driver_id = $1 
             ORDER BY sdate ASC`,
            [driverId]
        );
        
        console.log('Solving for K (assuming Score = 10 - K * Sum(Rates)):');
        res.rows.forEach(r => {
            const score = parseFloat(r.official_score || '0');
            const dist = parseFloat(r.dist || '0');
            const counts = r.counts || {};
            
            if (dist > 5 && score > 0) {
                const distRatio = dist / 100;
                
                // Categories:
                // harshAcceleration (low + high in Frotcom?)
                // harshBraking (low + high in Frotcom?)
                // lateralAcceleration (sharp cornering)
                // accelBrakeFastShift 
                
                const c_accel = (counts.lowSpeedAcceleration || 0) + (counts.highSpeedAcceleration || 0);
                const c_brake = (counts.lowSpeedBreak || 0) + (counts.highSpeedBreak || 0);
                const c_corner = (counts.lateralAcceleration || 0);
                const c_shift = (counts.accelBrakeFastShift || 0);
                
                const sumRates = (c_accel + c_brake + c_corner + c_shift) / distRatio;
                const penalty = 10 - score;
                
                if (sumRates > 0) {
                    const K = penalty / sumRates;
                    console.log(`Date: ${r.sdate.toISOString().split('T')[0]} | Score: ${score.toFixed(2)} | SumRates: ${sumRates.toFixed(2)} | K: ${K.toFixed(4)}`);
                }
            }
        });
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

solveK();
