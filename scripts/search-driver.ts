
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function searchDriver() {
    try {
        const res = await pool.query("SELECT id, name, frotcom_id FROM drivers WHERE name ILIKE '%Miroslav%' OR name ILIKE '%Мирослав%'");
        console.log('Search results:');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

searchDriver();
