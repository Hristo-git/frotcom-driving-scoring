import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const r = await pool.query(`
        SELECT
            CASE
                WHEN license_plate ~ '-[А-Яа-яA-Za-z]+$'
                    THEN regexp_replace(license_plate, '^.*-', '')
                ELSE 'Без категория'
            END as category,
            COUNT(*) as vehicles
        FROM vehicles
        GROUP BY 1
        ORDER BY 2 DESC
    `);
    console.log('Vehicle categories:');
    console.table(r.rows);

    // Also check what the metadata contains - maybe category is stored there
    const r2 = await pool.query(`SELECT metadata FROM vehicles LIMIT 5`);
    console.log('\nSample metadata keys:', r2.rows.map((r: any) => Object.keys(r.metadata)));
    await pool.end();
}
run().catch(console.error);
