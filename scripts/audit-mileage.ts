import pool from '../lib/db';

async function test() {
    const name = 'Николай Красимиров Костадинов - Петрич';
    const start = '2026-03-01';
    const end = '2026-03-27';
    
    console.log(`Analyzing Mileage for ${name} [${start} to ${end}]`);
    
    const res = await pool.query(`
        SELECT 
            period_start, 
            period_end, 
            metrics->>'mileage' as mileage,
            DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as sofia_start,
            DATE((period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as sofia_end
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name = $1
        ORDER BY period_start ASC
    `, [name]);

    let totalInRange = 0;
    console.log("\nDays Found:");
    res.rows.forEach(r => {
        const m = parseFloat(r.mileage) || 0;
        const inRange = r.sofia_start >= start && r.sofia_end <= end;
        if (inRange) totalInRange += m;
        
        console.log(`${r.sofia_start} to ${r.sofia_end} | Mileage: ${m.toFixed(2).padEnd(8)} | In Range: ${inRange}`);
    });

    console.log(`\nTotal Mileage in Range: ${totalInRange.toFixed(2)}`);
    
    // Check if there are any records JUST outside the range
    const resAll = await pool.query(`
        SELECT SUM(CAST(metrics->>'mileage' AS NUMERIC)) as total
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name = $1
          AND period_start >= '2026-02-28'
          AND period_start <= '2026-03-31'
    `, [name]);
    console.log(`Total Mileage in March (approx): ${resAll.rows[0].total}`);

    await pool.end();
}
test().catch(console.error);
