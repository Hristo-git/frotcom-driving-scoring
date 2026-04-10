import pool from '../lib/db';

async function test() {
    // Nikolai id = 45 (approx?), Kostadin id = 36? 
    // Let's search by name
    const driversRes = await pool.query("SELECT id, name FROM drivers WHERE name LIKE '%Николай Красимиров%' OR name LIKE '%Костадин Ангелов%' OR name LIKE '%Живко Георгиев%'");
    
    console.log("Analyzing Drivers:", driversRes.rows.map(r => r.name));

    for (const driver of driversRes.rows) {
        console.log(`\n--- ${driver.name} ---`);
        const res = await pool.query(`
            SELECT 
                overall_score, 
                metrics->>'highRPMPerc' as rpm, 
                metrics->>'idleTimePerc' as idle,
                period_start
            FROM ecodriving_scores 
            WHERE driver_id = $1 
            ORDER BY period_start DESC 
            LIMIT 15
        `, [driver.id]);

        res.rows.forEach(r => {
            console.log(`${r.period_start.toISOString().split('T')[0]} | Score: ${r.overall_score} | RPM: ${r.rpm} | Idle: ${r.idle}`);
        });
    }

    await pool.end();
}

test().catch(console.error);
