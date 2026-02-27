import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const r = await pool.query(`
        SELECT
            d.name,
            es.overall_score,
            es.metrics->>'mileage'            AS km,
            es.metrics->>'drivingTime'         AS driving_sec,
            es.metrics->>'averageConsumption'  AS avg_consumption,
            es.metrics->>'vehicles'            AS vehicles,
            es.metrics->>'score'               AS frotcom_score,
            es.metrics->>'idleTimePerc'        AS idle_perc,
            es.metrics->>'highRPMPerc'         AS rpm_perc
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE es.period_start >= '2026-02-18T00:00:00'
          AND es.period_end   <= '2026-02-18T23:59:59'
        ORDER BY es.overall_score DESC
    `);

    console.log(`\nFeb 18 records in DB: ${r.rows.length}\n`);
    console.log('Score | Frotcom | Km      | h:mm | L/100km | Vehicles            | Driver');
    console.log('─'.repeat(110));

    r.rows.forEach((row: any) => {
        const km = parseFloat(row.km || '0').toFixed(1).padStart(6);
        const sec = parseInt(row.driving_sec || '0');
        const h = Math.floor(sec / 3600);
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
        const time = sec > 0 ? `${h}:${m}` : '--:--';
        const cons = parseFloat(row.avg_consumption || '0').toFixed(2);
        const score = parseFloat(row.overall_score || '0').toFixed(2);
        const fscore = parseFloat(row.frotcom_score || '0').toFixed(1);
        let vehicles: string[] = [];
        try { vehicles = JSON.parse(row.vehicles || '[]'); } catch { }
        const plates = vehicles.join(', ').substring(0, 30);

        console.log(
            `${score.padStart(5)} | ${fscore.padStart(7)} | ${km} km | ${time.padStart(4)} | ${cons.padStart(7)} | ${plates.padEnd(20)} | ${row.name}`
        );
    });

    await pool.end();
}

run().catch(console.error);
