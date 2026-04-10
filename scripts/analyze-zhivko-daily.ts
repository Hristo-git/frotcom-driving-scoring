import pool from '../lib/db';

async function examineZhivkoDaily() {
    console.log("Examining Daily Scores for Zhivko Ivanov (Mar 01 - Mar 27)...");

    const res = await pool.query(`
        SELECT 
            es.period_start,
            es.overall_score,
            es.metrics->>'mileage' as dist,
            es.metrics->>'idleTimePerc' as idle,
            es.metrics->>'highRPMPerc' as rpm,
            es.metrics->'eventCounts' as events
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name LIKE '%Живко%'
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
          AND DATE((es.period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-27'
        ORDER BY es.period_start ASC
    `);

    let wSum = 0;
    let tDist = 0;
    let tScore = 0;

    res.rows.forEach(r => {
        const d = parseFloat(r.dist) || 0;
        const s = parseFloat(r.overall_score) || 0;
        console.log(`Date: ${r.period_start.toISOString().split('T')[0]} | Score: ${s.toFixed(2)} | Dist: ${d.toFixed(1)} km | Idle: ${r.idle}% | RPM: ${r.rpm}%`);
        wSum += (s * d);
        tDist += d;
        tScore += s;
    });

    console.log("-".repeat(60));
    console.log(`Weighted Average Score: ${(wSum / tDist).toFixed(2)}`);
    console.log(`Simple Mean Score: ${(tScore / res.rowCount).toFixed(2)}`);
    console.log(`Total Distance: ${tDist.toFixed(1)} km`);

    await pool.end();
}

examineZhivkoDaily().catch(console.error);
