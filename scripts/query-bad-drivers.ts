import pool from '../lib/db';
import fs from 'fs';

async function test() {
    const names = ['Марјан Трајковски - Скопие', 'Yordan Angelov - Русе'];
    let output = '';

    for (const name of names) {
        const res = await pool.query(`
            SELECT es.overall_score as f_score, es.metrics->>'mileage' as dist, 
                   es.metrics->'eventCounts' as events, es.metrics->>'highRPMPerc' as rpm, 
                   es.metrics->>'idleTimePerc' as idle 
            FROM ecodriving_scores es 
            JOIN drivers d ON es.driver_id = d.id 
            WHERE d.name = $1 
              AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
        `, [name]);
        
        output += `=== ${name} ===\n`;
        output += JSON.stringify(res.rows, null, 2) + '\n\n';
    }

    fs.writeFileSync('bad_drivers.txt', output);
    await pool.end();
}

test().catch(console.error);
