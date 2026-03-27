
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findConstants() {
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
        
        console.log('Daily Analysis for Nikolai (K=0.31, weights from scoring.ts):');
        
        const weights = {
            lowAccel: 1.0,
            highAccel: 1.5,
            lowBrake: 1.0,
            highBrake: 1.5,
            cornering: 1.2,
            fastShift: 0.5
        };
        
        const K = 0.31;
        
        res.rows.forEach(r => {
            const score = parseFloat(r.official_score || '0');
            const dist = parseFloat(r.dist || '0');
            const counts = r.counts || {};
            
            if (dist > 5 && score > 0 && counts.lowSpeedAcceleration !== undefined) {
                const distRatio = dist / 100;
                
                const wSum = (
                    (counts.lowSpeedAcceleration || 0) * weights.lowAccel +
                    (counts.highSpeedAcceleration || 0) * weights.highAccel +
                    (counts.lowSpeedBreak || 0) * weights.lowBrake +
                    (counts.highSpeedBreak || 0) * weights.highBrake +
                    (counts.lateralAcceleration || 0) * weights.cornering +
                    (counts.accelBrakeFastShift || 0) * weights.fastShift
                );
                
                const rate = wSum / distRatio;
                const calcScore = Math.max(0, 10 - K * rate);
                
                console.log(`Date: ${r.sdate.toISOString().split('T')[0]} | Official: ${score.toFixed(2)} | Calc: ${calcScore.toFixed(2)} | Rate: ${rate.toFixed(1)}`);
            }
        });
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findConstants();
