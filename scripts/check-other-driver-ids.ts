
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkDrivers() {
    const frotcomIds = [307869, 349642, 284272];

    try {
        const res = await pool.query(
            `SELECT name, frotcom_id FROM drivers WHERE frotcom_id = ANY($1::text[])`,
            [frotcomIds.map(String)]
        );
        console.table(res.rows);
    } catch (e: any) {
        console.error(e.message);
    } finally {
        await pool.end();
    }
}
checkDrivers();
