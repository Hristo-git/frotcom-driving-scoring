import pool from '../lib/db';

async function test() {
    console.log("Auditing Martin Todorov (Matches Dashboard: 4158 km)");
    const martin = await pool.query(`
        SELECT 
            DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as sofia_day,
            metrics->>'mileage' as m
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name = 'Мартин Николаев Тодоров - Петрич'
          AND DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
          AND DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-27'
    `);
    const sumM = martin.rows.reduce((a, b) => a + parseFloat(b.m || 0), 0);
    console.log(`Martin Total: ${sumM}`);

    console.log("\nAuditing Nikolai (Dashboard: 4703.4 km)");
    const nikolai = await pool.query(`
        SELECT 
            DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as sofia_day,
            metrics->>'mileage' as m
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name = 'Николай Красимиров Костадинов - Петрич'
          AND DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
          AND DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-27'
    `);
    const sumN = nikolai.rows.reduce((a, b) => a + parseFloat(b.m || 0), 0);
    console.log(`Nikolai Total: ${sumN}`);

    await pool.end();
}
test().catch(console.error);
