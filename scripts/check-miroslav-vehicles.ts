import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    // Find Miroslav's data for Feb 25
    const r = await pool.query(`
        SELECT d.name, es.period_start, es.metrics->>'vehicles' as vehicles,
               es.metrics->>'mileage' as mileage, es.overall_score
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name ILIKE '%Miroslav%Urdarski%'
           OR d.name ILIKE '%Vladim%Urdarski%'
           OR d.name ILIKE '%Marcianidi%'
           OR d.name ILIKE '%Stolnik%'
        ORDER BY es.period_start DESC
        LIMIT 10
    `);
    console.log('Miroslav records:');
    r.rows.forEach((row: any) => {
        console.log(`  ${row.period_start?.toISOString().slice(0, 10)} | score=${row.overall_score} | km=${row.mileage} | vehicles=${row.vehicles}`);
    });

    // Also search by name fragment
    const r2 = await pool.query(`
        SELECT d.name, es.period_start, es.metrics->>'vehicles' as vehicles, es.metrics->>'mileage' as km
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name ILIKE '%Miroslav%'
        ORDER BY es.period_start DESC
        LIMIT 10
    `);
    console.log('\nAll Miroslav records:');
    r2.rows.forEach((row: any) => {
        console.log(`  ${row.name} | ${row.period_start?.toISOString().slice(0, 10)} | vehicles=${row.vehicles} | km=${row.km}`);
    });

    await pool.end();
}
run().catch(console.error);
