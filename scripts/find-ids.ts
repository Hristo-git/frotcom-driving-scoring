import pool from '../lib/db';

async function test() {
    console.log("Finding IDs for target drivers:");
    const res = await pool.query(`
        SELECT id, name FROM drivers 
        WHERE name LIKE '%Николай Красимиров Костадинов%'
           OR name LIKE '%Костадин Ангелов Аклашев%'
           OR name LIKE '%Мартин Николаев Тодоров%'
    `);
    res.rows.forEach(r => console.log(`${r.id}: ${r.name}`));
    await pool.end();
}
test().catch(console.error);
