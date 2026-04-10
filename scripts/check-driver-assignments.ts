import pool from '../lib/db';

async function main() {
    // Count drivers with/without country and warehouse
    const r = await pool.query(`
        SELECT
            COUNT(*) as total,
            COUNT(d.country_id) as with_country,
            COUNT(*) - COUNT(d.country_id) as no_country,
            COUNT(d.warehouse_id) as with_warehouse,
            COUNT(*) - COUNT(d.warehouse_id) as no_warehouse
        FROM drivers d
    `);
    console.log('Driver assignments:');
    console.log(JSON.stringify(r.rows[0], null, 2));

    // Show drivers without country
    const r2 = await pool.query(`
        SELECT d.id, d.frotcom_id, d.name, d.country_id, d.warehouse_id,
               c.name as country, w.name as warehouse
        FROM drivers d
        LEFT JOIN countries c ON d.country_id = c.id
        LEFT JOIN warehouses w ON d.warehouse_id = w.id
        WHERE d.country_id IS NULL OR d.warehouse_id IS NULL
        ORDER BY d.name
    `);
    console.log(`\nDrivers without country or warehouse (${r2.rows.length}):`);
    for (const row of r2.rows) {
        console.log(`  ${row.name.padEnd(45)} country=${row.country || 'NULL'}  warehouse=${row.warehouse || 'NULL'}`);
    }

    // Show breakdown by country
    const r3 = await pool.query(`
        SELECT c.name as country, COUNT(*) as drivers
        FROM drivers d
        LEFT JOIN countries c ON d.country_id = c.id
        GROUP BY c.name
        ORDER BY drivers DESC
    `);
    console.log('\nDrivers by country:');
    for (const row of r3.rows) {
        console.log(`  ${(row.country || 'NULL').padEnd(30)} ${row.drivers}`);
    }

    await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
