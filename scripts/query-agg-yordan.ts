import pool from '../lib/db';

async function test() {
    const names = ['Yordan Angelov - Русе', 'Марјан Трајковски - Скопие'];
    
    for (const name of names) {
        const res = await pool.query(`
            SELECT 
                SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as total_dist,
                SUM(overall_score * CAST(es.metrics->>'mileage' AS NUMERIC))/SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as f_agg
            FROM ecodriving_scores es 
            JOIN drivers d ON es.driver_id = d.id 
            WHERE d.name = $1 
              AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
        `, [name]);
        
        console.log(`${name}: Dist=` + res.rows[0].total_dist + ` FrotcomAgg=` + res.rows[0].f_agg);
    }

    await pool.end();
}

test().catch(console.error);
