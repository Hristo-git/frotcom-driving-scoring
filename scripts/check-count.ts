
import pool from '../lib/db';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check() {
    try {
        const res = await pool.query('SELECT count(*) FROM vehicles');
        console.log('Vehicles count:', res.rows[0].count);

        const res2 = await pool.query('SELECT count(*) FROM drivers');
        console.log('Drivers count:', res2.rows[0].count);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
