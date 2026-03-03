
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkSchema() {
    try {
        const res = await pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'ecodriving_events'`
        );
        console.log("Columns:", res.rows.map(r => r.column_name));
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
checkSchema();
