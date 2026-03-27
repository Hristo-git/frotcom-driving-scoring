import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function run() {
    const engine = new ScoringEngine();
    engine.setProfile('frotcom_personalized');

    const start = '2026-03-01T00:00:00Z';
    const end = '2026-03-25T23:59:59Z';
    const dbStart = '2026-03-01';
    const dbEnd = '2026-03-25';

    try {
        // Pick 5 drivers with most mileage in March
        const res = await pool.query(`
            SELECT d.id, d.name, SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as dist
            FROM drivers d
            JOIN ecodriving_scores es ON d.id = es.driver_id
            WHERE es.period_start >= $1 AND es.period_start <= $2
            GROUP BY d.id, d.name
            ORDER BY dist DESC
            LIMIT 5
        `, [dbStart, dbEnd]);
        
        const drivers = res.rows;
        console.log(`Comparing 5 Top Drivers for March 1 - March 25:\n`);

        for (const d of drivers) {
            // Get local computed
            const results = await engine.getDriverPerformance(start, end, { driverIds: [d.id] });
            
            // Get DB Official
            const dbRes = await pool.query(`
                SELECT 
                    SUM(overall_score * (metrics->>'mileage')::float) / NULLIF(SUM((metrics->>'mileage')::float), 0) as weighted_official_score,
                    SUM((metrics->>'mileage')::float) as total_mileage
                FROM ecodriving_scores
                WHERE driver_id = $1 AND period_start >= $2 AND period_start <= $3
            `, [d.id, dbStart, dbEnd]);

            const targetScore = dbRes.rows[0].weighted_official_score !== null ? parseFloat(dbRes.rows[0].weighted_official_score).toFixed(2) : 'N/A';
            const targetMileage = dbRes.rows[0].total_mileage !== null ? parseFloat(dbRes.rows[0].total_mileage).toFixed(1) : 'N/A';

            if (results.length > 0) {
                const r = results[0];
                console.log(`Driver: ${r.driverName} (ID: ${r.driverId})`);
                console.log(`  Distance: LOCAL(${r.distance.toFixed(1)} km) vs FROTCOM(${targetMileage} km)`);
                console.log(`  Score:    LOCAL(${r.score.toFixed(2)}) vs FROTCOM(${targetScore})`);
                console.log(`  Events/100km: C(${ (r.events.lateralAcceleration / (r.distance/100)).toFixed(2) }), A(${ ((r.events.lowSpeedAcceleration + r.events.highSpeedAcceleration) / (r.distance/100)).toFixed(2) }), B(${ ((r.events.lowSpeedBreak + r.events.highSpeedBreak) / (r.distance/100)).toFixed(2) })`);
                console.log('------------------------------------');
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
