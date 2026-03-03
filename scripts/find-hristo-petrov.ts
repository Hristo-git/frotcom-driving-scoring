
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findHristo() {
    try {
        const query = `
            SELECT id, frotcom_id, name 
            FROM drivers 
            WHERE name ILIKE '%Hristo%' 
               OR name ILIKE '%Христо%'
               OR name ILIKE '%Petrov%'
               OR name ILIKE '%Петров%'
        `;
        const res = await pool.query(query);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
findHristo();
