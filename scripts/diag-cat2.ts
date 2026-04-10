import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
(async () => {
    const r = await pool.query(`
        SELECT
            metadata->>'vehicleAssetType' as asset_type,
            metadata->>'department' as dept,
            license_plate,
            metadata->>'manufacturer' as mfr
        FROM vehicles
        LIMIT 20
    `);
    r.rows.forEach((row: any) => console.log(JSON.stringify(row)));

    const r2 = await pool.query(`
        SELECT metadata->>'vehicleAssetType' as t, COUNT(*) FROM vehicles GROUP BY 1 ORDER BY 2 DESC
    `);
    console.log('\nasset types:');
    r2.rows.forEach((row: any) => console.log(' ', row.t, row.count));
    await pool.end();
})().catch(console.error);
