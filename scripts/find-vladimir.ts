
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function findDriver() {
    try {
        const res = await pool.query("SELECT id, name FROM drivers WHERE name ILIKE '%Vladimir%'");
        console.table(res.rows);
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
findDriver();
