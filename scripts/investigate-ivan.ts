
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findIvan() {
    const res = await pool.query("SELECT name, frotcom_id, id FROM drivers WHERE name ILIKE '%Иван Илиев%'");
    console.log("Found drivers:", res.rows);
    if (res.rows.length > 0) {
        console.log("IVAN_INTERNAL_ID:", res.rows[0].id);
    }
    
    if (res.rows.length === 0) return;
    
    const ivanId = res.rows[0].id; // Let's assume the first one if multiple, but likely just one
    
    // Check March 1-15 aggregate
    const aggregateRes = await pool.query(`
        SELECT 
            SUM((metrics->>'mileage')::float) as total_mileage,
            SUM((metrics->>'drivingTime')::float) as total_driving_time,
            AVG(overall_score) as avg_score_naive,
            COUNT(*) as days_count
        FROM ecodriving_scores
        WHERE driver_id = $1 
        AND period_start >= '2026-03-01' 
        AND period_start < '2026-03-16'
    `, [ivanId]);
    
    console.log("\nDB Aggregate (Naive):", aggregateRes.rows[0]);

    // Check individual days to see if eventCounts are missing or strange
    const daysRes = await pool.query(`
        SELECT 
            period_start,
            overall_score,
            metrics->>'mileage' as mileage,
            metrics->'eventCounts' as eventCounts,
            metrics->>'idleTimePerc' as idle,
            metrics->>'highRPMPerc' as rpm
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
        mileage: r.mileage,
        idle: r.idle,
        rpm: r.rpm,
        events: r.eventcounts ? Object.keys(r.eventcounts).length : 'MISSING'
    })));
}

findIvan().then(() => pool.end()).catch(console.error);
