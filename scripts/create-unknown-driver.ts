
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
    // Check if Unidentified Driver exists
    const q1 = await pool.query(`SELECT id FROM drivers WHERE frotcom_id = 'UNKNOWN_DRIVER'`);
    if (q1.rowCount === 0) {
        console.log('Inserting Unidentified Driver...');
        await pool.query(`
            INSERT INTO drivers (frotcom_id, name)
            VALUES ('UNKNOWN_DRIVER', 'Неразпознат шофьор')
        `);
    } else {
        console.log('Unidentified Driver already exists.');
    }
    
    await pool.end();
}

main().catch(console.error);
