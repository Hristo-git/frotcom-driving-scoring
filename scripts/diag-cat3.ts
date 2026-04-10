import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(async () => {
    // Category breakdown by plate suffix in vehicles table
    const r1 = await pool.query(`
        SELECT
            CASE
                WHEN license_plate ~ '-[Бб]$' THEN 'Категория B'
                WHEN license_plate ~ '-[Цц]$' THEN 'Категория C'
                ELSE 'Без наставка'
            END as category,
            COUNT(*) as cnt
        FROM vehicles
        GROUP BY 1 ORDER BY 2 DESC
    `);
    console.log('=== Vehicles table по категория ===');
    console.table(r1.rows);

    // Sample vehicles WITHOUT suffix
    const r2 = await pool.query(`
        SELECT license_plate, metadata->>'manufacturer' as mfr, metadata->>'model' as model
        FROM vehicles
        WHERE license_plate !~ '-[А-Яа-яA-Za-z]+$'
        LIMIT 20
    `);
    console.log('\n=== Автомобили БЕЗ наставка (sample) ===');
    r2.rows.forEach((r: any) => console.log(`  ${r.license_plate} | ${r.mfr} ${r.model}`));

    // Check if maybe category is in a different field
    const r3 = await pool.query(`
        SELECT
            metadata->>'vehicleAssetType' as asset_type,
            metadata->>'field1' as field1,
            license_plate
        FROM vehicles
        WHERE license_plate !~ '-[А-Яа-яA-Za-z]+$'
        LIMIT 10
    `);
    console.log('\n=== metadata на автомобили без наставка ===');
    r3.rows.forEach((r: any) => console.log(`  ${r.license_plate} | asset=${r.asset_type} | field1=${r.field1}`));

    // Full metadata sample for one without suffix
    const r4 = await pool.query(`
        SELECT license_plate, metadata
        FROM vehicles
        WHERE license_plate !~ '-[А-Яа-яA-Za-z]+$'
        LIMIT 3
    `);
    console.log('\n=== Full metadata sample ===');
    r4.rows.forEach((r: any) => console.log(`${r.license_plate}:`, JSON.stringify(r.metadata, null, 2)));

    await pool.end();
})().catch(console.error);
