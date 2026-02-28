import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findDriver() {
    try {
        const query = `
            SELECT id, name FROM drivers 
            WHERE name ILIKE '%Krasimir%' 
               OR name ILIKE '%Красимир%'
        `;
        const { rows } = await pool.query(query);
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
findDriver();
