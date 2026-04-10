import pool from '../lib/db';

async function listPeriods() {
    const res = await pool.query(`
        SELECT DISTINCT period_start, period_end 
        FROM ecodriving_scores 
        ORDER BY period_start DESC 
        LIMIT 20
    `);
    console.table(res.rows.map(r => ({
        start: r.period_start.toISOString(),
        end: r.period_end.toISOString()
    })));
    await pool.end();
}

listPeriods().catch(console.error);
