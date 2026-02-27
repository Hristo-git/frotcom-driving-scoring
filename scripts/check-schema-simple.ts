import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
    const res = await pool.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('ecodriving_scores', 'ecodriving_events') 
        ORDER BY table_name, ordinal_position
    `);
    console.table(res.rows);
    await pool.end();
}
checkSchema();
