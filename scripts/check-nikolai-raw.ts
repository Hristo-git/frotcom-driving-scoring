import pool from '../lib/db';

async function test() {
    const name = 'Николай Красимиров Костадинов - Петрич';
    const day = '2026-03-19';
    
    console.log(`Auditing Raw Events for ${name} on ${day}`);
    
    const res = await pool.query(`
        SELECT 
            event_type,
            count(*) as c
        FROM ecodriving_events ee
        JOIN drivers d ON ee.driver_id = d.id
        WHERE d.name = $1
          AND DATE((ee.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = $2
        GROUP BY event_type
    `, [name, day]);

    console.log("Raw Events Found:");
    res.rows.forEach(r => {
        console.log(`- ${r.event_type}: ${r.c}`);
    });

    const scoreRow = await pool.query(`
        SELECT metrics->'eventCounts' as events
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name = $1
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = $2
    `, [name, day]);
    
    console.log("\nEvents in ecodriving_scores.metrics:");
    console.log(JSON.stringify(scoreRow.rows[0]?.events, null, 2));

    await pool.end();
}
test().catch(console.error);
