
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function aggregateNikolai() {
    try {
        const driverId = 342;
        const res = await pool.query(
            `SELECT metrics FROM ecodriving_scores 
             WHERE driver_id = $1 AND period_start >= '2026-03-01' AND period_end <= '2026-03-15'`,
            [driverId]
        );
        
        let totalDist = 0;
        let counts = {
            lowAccel: 0,
            highAccel: 0,
            lowBrake: 0,
            highBrake: 0,
            cornering: 0,
            fastShift: 0
        };
        
        res.rows.forEach(r => {
            const m = r.metrics || {};
            const c = m.eventCounts || {};
            const dist = parseFloat(m.mileage) || 0;
            
            if (dist > 0 && c.lowSpeedAcceleration !== undefined) {
                totalDist += dist;
                counts.lowAccel += (c.lowSpeedAcceleration || 0);
                counts.highAccel += (c.highSpeedAcceleration || 0);
                counts.lowBrake += (c.lowSpeedBreak || 0);
                counts.highBrake += (c.highSpeedBreak || 0);
                counts.cornering += (c.lateralAcceleration || 0);
                counts.fastShift += (c.accelBrakeFastShift || 0);
            }
        });
        
        if (totalDist > 0) {
            const distRatio = totalDist / 100;
            const rates = {
                lowAccel: counts.lowAccel / distRatio,
                highAccel: counts.highAccel / distRatio,
                lowBrake: counts.lowBrake / distRatio,
                highBrake: counts.highBrake / distRatio,
                cornering: counts.cornering / distRatio,
                fastShift: counts.fastShift / distRatio
            };
            
            // Weights from my reverse engineering
            const w = {
                lowAccel: 1.0,
                highAccel: 1.5,
                lowBrake: 1.0,
                highBrake: 1.5,
                cornering: 1.2,
                fastShift: 0.5
            };
            
            const K = 0.31;
            const weightedSum = (
                rates.lowAccel * w.lowAccel +
                rates.highAccel * w.highAccel +
                rates.lowBrake * w.lowBrake +
                rates.highBrake * w.highBrake +
                rates.cornering * w.cornering +
                rates.fastShift * w.fastShift
            );
            
            const score = Math.max(0, 10 - K * weightedSum);
            
            console.log(`Summary for Nikolai (March 1-15):`);
            console.log(`Total Distance: ${totalDist.toFixed(1)} km`);
            console.log(`Weighted Rate Sum: ${weightedSum.toFixed(2)}`);
            console.log(`Calculated Score (K=${K}): ${score.toFixed(1)}`);
            console.log(`Target Dashboard Score: 4.1`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

aggregateNikolai();
