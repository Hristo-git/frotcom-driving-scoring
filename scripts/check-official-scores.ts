
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkOfficialScores() {
    try {
        const driverId = 342;
        const res = await pool.query(
            `SELECT 
                DATE(period_start AT TIME ZONE 'Europe/Sofia') as sdate,
                metrics->>'score' as official_score,
                metrics->'eventCounts' as event_counts,
                metrics->'mileage' as mileage
             FROM ecodriving_scores 
             WHERE driver_id = $1 
             ORDER BY sdate ASC`,
            [driverId]
        );
        
        let totalWeightedScore = 0;
        let totalDist = 0;
        
        console.log('Daily comparison for Nikolai:');
        res.rows.forEach(r => {
            const score = parseFloat(r.official_score || '0');
            const dist = parseFloat(r.mileage || '0');
            const hasEvents = !!r.event_counts;
            console.log(`Date: ${r.sdate.toISOString().split('T')[0]} | Official: ${score.toFixed(2)} | Dist: ${dist.toFixed(1)} | Has Events: ${hasEvents}`);
            
            if (dist > 0 && r.sdate.toISOString().split('T')[0] >= '2026-03-01' && r.sdate.toISOString().split('T')[0] <= '2026-03-15') {
                totalWeightedScore += score * dist;
                totalDist += dist;
            }
        });
        
        if (totalDist > 0) {
            console.log(`\nNikolai's Frotcom weighted average for March 1-15: ${(totalWeightedScore / totalDist).toFixed(2)}`);
            console.log(`Total Distance: ${totalDist.toFixed(1)} km`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkOfficialScores();
