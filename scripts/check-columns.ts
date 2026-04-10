import pool from '../lib/db';

async function test() {
    console.log("Checking columns for ecodriving_events:");
    const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ecodriving_events'
    `);
    columns.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
    await pool.end();
}
test().catch(console.error);
