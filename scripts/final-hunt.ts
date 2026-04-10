import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function test() {
    const anchors = [
        { name: 'Николай Красимиров Костадинов - Петрич', target: 4.30, id: 342 },
        { name: 'Костадин Ангелов Аклашев - Петрич', target: 7.70, id: 350 },
        { name: 'Мартин Николаев Тодоров - Петрич', target: 5.40, id: 346 }
    ];

    const engine = new ScoringEngine();
    const data: any[] = [];
    const start = '2026-03-01'; const end = '2026-03-27';

    for (const a of anchors) {
        const res = await pool.query(`
            SELECT es.period_start, es.metrics->>'mileage' as dist, es.metrics->>'highRPMPerc' as rpm, es.metrics->>'idleTimePerc' as idle
            FROM ecodriving_scores es WHERE driver_id = $1 AND DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') BETWEEN $2 AND $3
        `, [a.id, start, end]);

        const days: any[] = [];
        for (const r of res.rows) {
            const rawEvents = await pool.query(`
                SELECT event_type, COUNT(*) as c FROM ecodriving_events
                WHERE driver_id = $1 AND DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = DATE(($2::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                GROUP BY event_type
            `, [a.id, r.period_start]);
            const ec = {}; rawEvents.rows.forEach(re => ec[re.event_type] = parseInt(re.c));
            days.push({ mileage: parseFloat(r.dist) || 0, eventCounts: ec, highRPMPerc: parseFloat(r.rpm) || 0, idleTimePerc: parseFloat(r.idle) || 0 });
        }
        data.push({ ...a, days });
    }

    let minErr = Infinity; let bW: any = null;

    // Search up to 5.0 for Safety!
    for (let wS = 1.0; wS <= 10.0; wS += 0.5) {
        for (let wE = 0.1; wE <= 0.5; wE += 0.05) {
            const W = {
                harshAccelerationLow: wS, harshAccelerationHigh: wS,
                harshBrakingLow: wS, harshBrakingHigh: wS,
                harshCornering: wS, accelBrakeSwitch: 0,
                excessiveIdling: wE, highRPM: wE,
                alarms: 0, noCruiseControl: 0, accelDuringCruise: 0
            };
            let err = 0;
            for (const d of data) {
                let tD = 0; let tSW = 0;
                d.days.forEach(day => {
                    const s = engine.calculateCustomScore(day, W);
                    tD += day.mileage; tSW += (s * day.mileage);
                });
                err += Math.abs((tSW / tD) - d.target);
            }
            if (err < minErr) { minErr = err; bW = { wS, wE }; }
        }
    }

    console.log(`Best Safety: ${bW.wS} | Best Eco: ${bW.wE}`);
    // Check final results
    const fw = {
        harshAccelerationLow: bW.wS, harshAccelerationHigh: bW.wS, harshBrakingLow: bW.wS, harshBrakingHigh: bW.wS,
        harshCornering: bW.wS, excessiveIdling: bW.wE, highRPM: bW.wE
    };
    data.forEach(d => {
        let tD = 0; let tSW = 0;
        d.days.forEach(day => { const s = engine.calculateCustomScore(day, fw as any); tD += day.mileage; tSW += (s * day.mileage); });
        console.log(`${d.name} | Target: ${d.target} | Calc: ${(tSW / tD).toFixed(2)}`);
    });

    await pool.end();
}
test().catch(console.error);
