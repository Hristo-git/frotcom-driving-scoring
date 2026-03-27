import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
    console.log("Deleting all records for March 15th before fetching new stats.")
    const deleteRes = await pool.query(`
        DELETE FROM ecodriving_scores
        WHERE period_start = '2026-03-15T00:00:00'
        RETURNING *
    `);

    console.log(`Deleted ${deleteRes.rowCount} rows.`);
    await pool.end();
}

main().catch(console.error);
