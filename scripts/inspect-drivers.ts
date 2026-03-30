
import pool from '../lib/db.js';

async function inspectDrivers() {
    const start = '2026-03-01T00:00:00+02:00';
    const end = '2026-03-27T23:59:59+02:00';

    const query = `
        SELECT 
            d.name,
            SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as mileage,
            SUM(CAST(es.metrics->>'highRPMPerc' AS NUMERIC) * CAST(es.metrics->>'mileage' AS NUMERIC)) / NULLIF(SUM(CAST(es.metrics->>'mileage' AS NUMERIC)), 0) as high_rpm_perc,
            SUM(CAST(es.metrics->>'idleTimePerc' AS NUMERIC) * CAST(es.metrics->>'mileage' AS NUMERIC)) / NULLIF(SUM(CAST(es.metrics->>'mileage' AS NUMERIC)), 0) as idle_time_perc
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= DATE($1::timestamptz AT TIME ZONE 'Europe/Sofia')
          AND DATE((es.period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= DATE($2::timestamptz AT TIME ZONE 'Europe/Sofia')
        GROUP BY d.name
        HAVING d.name IN ('Костадин Ангелов Аклашев - Петрич', 'Николай Красимиров Костадинов - Петрич', 'Живко Георгиев Иванов - Петрич')
    `;

    const res = await pool.query(query, [start, end]);
    
    // Get also the event counts
    const eventQuery = `
        SELECT 
            d.name,
            ev.event_type,
            COUNT(*) as count
        FROM ecodriving_events ev
        JOIN drivers d ON ev.driver_id = d.id
        WHERE DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= DATE($1::timestamptz AT TIME ZONE 'Europe/Sofia')
          AND DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= DATE($2::timestamptz AT TIME ZONE 'Europe/Sofia')
        GROUP BY d.name, ev.event_type
        HAVING d.name IN ('Костадин Ангелов Аклашев - Петрич', 'Николай Красимиров Костадинов - Петрич', 'Живко Георгиев Иванов - Петрич')
    `;

    const eventRes = await pool.query(eventQuery, [start, end]);

    console.log("--- Driver Metrics ---");
    res.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    console.log("\n--- Event Counts ---");
    eventRes.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    await pool.end();
}

inspectDrivers();
