import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check() {
    // Check a record with failing criteria
    const r = await pool.query(`
        SELECT d.name as driver_name, es.overall_score, es.metrics
        FROM ecodriving_scores es
        JOIN drivers d ON d.id = es.driver_id
        WHERE es.period_start >= '2026-02-26'
          AND jsonb_array_length(COALESCE(es.metrics->'failingCriteria', '[]'::jsonb)) > 0
        ORDER BY es.overall_score ASC
        LIMIT 5
    `);

    console.log(`Found ${r.rows.length} records with failing criteria today.\n`);
    r.rows.forEach(row => {
        const m = row.metrics;
        console.log(`Driver: ${row.driver_name}`);
        console.log(`  score:           ${Number(m.score).toFixed(2)}`);
        console.log(`  scoreCustomized: ${Number(m.scoreCustomized).toFixed(2)}`);
        console.log(`  mileage (CAN):   ${Number(m.mileage).toFixed(1)} km`);
        console.log(`  mileageGps:      ${Number(m.mileageGps).toFixed(1)} km`);
        console.log(`  idleTimePerc:    ${m.idleTimePerc}`);
        console.log(`  highRPMPerc:     ${m.highRPMPerc}`);
        console.log(`  hasLowMileage:   ${m.hasLowMileage}`);
        console.log(`  failingCriteria: ${(m.failingCriteria || []).join(', ')}`);
        console.log('');
    });

    // Also check the Zhivko record as a baseline
    const z = await pool.query(`
        SELECT d.name, es.metrics
        FROM ecodriving_scores es
        JOIN drivers d ON d.id = es.driver_id
        WHERE d.frotcom_id = '308019'
          AND es.period_start >= '2026-02-26'
        LIMIT 1
    `);
    if (z.rows.length > 0) {
        const m = z.rows[0].metrics;
        console.log(`\nZhivko today: score=${m.score}, scoreCustomized=${m.scoreCustomized}, failingCriteria=[${(m.failingCriteria || []).join(', ')}]`);
    }

    await pool.end();
}

check().catch(console.error);
