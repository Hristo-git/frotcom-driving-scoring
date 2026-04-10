import pool from '../lib/db';

async function test() {
    const id = 49692; // Yordan's 0.00 score trip with 42km and null events
    const res = await pool.query(`SELECT * FROM ecodriving_scores WHERE id = $1`, [id]);
    console.log(JSON.stringify(res.rows[0], null, 2));
    await pool.end();
}
test().catch(console.error);
