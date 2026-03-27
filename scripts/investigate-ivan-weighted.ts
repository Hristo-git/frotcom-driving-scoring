
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findIvan() {
    const ivanId = 339; // Confirmed ID
    console.log(`Checking driver 339 (Ivan) for Mar 1 - Mar 15...`);

    const daysRes = await pool.query(`
        SELECT 
            period_start,
            overall_score,
            metrics->>'mileage' as mileage,
            metrics->'vehicles' as vehicles
        FROM ecodriving_scores
        WHERE driver_id = $1 
        AND period_start >= '2026-03-01' 
        AND period_start < '2026-03-16'
        ORDER BY period_start ASC
    `, [ivanId]);
    
    console.log("\nDaily Breakdown:");
    console.table(daysRes.rows.map(r => ({
        date: r.period_start.toISOString().split('T')[0],
        score: r.overall_score,
        mileage: parseFloat(r.mileage).toFixed(1),
        vehicles: r.vehicles ? r.vehicles.join(', ') : ''
    })));

    let totalDist = 0;
    let weightedScoreSum = 0;
    
    daysRes.rows.forEach(r => {
        const d = parseFloat(r.mileage) || 0;
        const s = parseFloat(r.overall_score) || 0;
        totalDist += d;
        weightedScoreSum += (s * d);
    });

    console.log("\nAggregate Analysis:");
    console.log("Total Mileage:", totalDist.toFixed(2));
    console.log("Weighted Average Score:", (totalDist > 0 ? weightedScoreSum / totalDist : 0).toFixed(2));
    console.log("Frotcom Dashboard:", 5.6);
}

findIvan().then(() => pool.end()).catch(console.error);
