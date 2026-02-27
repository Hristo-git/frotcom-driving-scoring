import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testQuery() {
    try {
        let query = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ecodriving_scores'
              AND column_name IN ('period_start', 'period_end');
        `;
        const { rows } = await pool.query(query);
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
testQuery();
