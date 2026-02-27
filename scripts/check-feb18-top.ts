import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    // Top 20 by score + km for Feb 18
    const r = await pool.query(`
        SELECT d.name, es.overall_score,
               CAST(es.metrics->>'mileage' AS NUMERIC)      AS km,
               CAST(es.metrics->>'drivingTime' AS NUMERIC)  AS sec,
               es.metrics->>'averageConsumption'             AS cons,
               es.metrics->>'vehicles'                       AS vehicles,
               es.metrics->>'score'                          AS fscore,
               es.period_start, es.period_end
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE es.period_start >= '2026-02-18T00:00:00'
          AND es.period_end   <= '2026-02-18T23:59:59'
          AND CAST(es.metrics->>'mileage' AS NUMERIC) > 50
        ORDER BY es.overall_score DESC, km DESC
        LIMIT 25
    `);

    console.log(`\nFeb 18 — drivers with >50km (${r.rows.length} shown):\n`);
    console.log('OurScore | FrotScore |     km | h:mm | L/100km | Vehicles                | Driver');
    console.log('─'.repeat(115));

    r.rows.forEach((row: any) => {
        const sec = parseInt(row.sec || 0);
        const h = Math.floor(sec / 3600);
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
        const time = sec > 0 ? `${h}:${m}` : '  -  ';
        let veh: string[] = [];
        try { veh = JSON.parse(row.vehicles || '[]'); } catch { }
        const plates = veh.join(', ').padEnd(23);
        const ourScore = parseFloat(row.overall_score || 0).toFixed(2).padStart(8);
        const frtScore = parseFloat(row.fscore || 0).toFixed(1).padStart(9);
        const km = parseFloat(row.km || 0).toFixed(1).padStart(6);
        const cons = parseFloat(row.cons || 0).toFixed(2).padStart(7);

        console.log(`${ourScore} | ${frtScore} | ${km} | ${time} | ${cons}   | ${plates} | ${row.name}`);
    });

    // Show stored period
    const p = await pool.query(`
        SELECT period_start, period_end FROM ecodriving_scores
        WHERE period_start >= '2026-02-18T00:00:00' AND period_end <= '2026-02-18T23:59:59'
        LIMIT 1
    `);
    if (p.rows[0]) {
        console.log(`\nStored period: ${p.rows[0].period_start?.toISOString()} → ${p.rows[0].period_end?.toISOString()}`);
    }

    await pool.end();
}
run().catch(console.error);
