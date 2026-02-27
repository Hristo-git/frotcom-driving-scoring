
import { syncDriversAndVehicles } from '../lib/sync';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSync() {
    console.log('Starting metadata sync test...');
    await syncDriversAndVehicles();

    // Verify data in DB
    const db = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await db.connect();

        const driversCount = await db.query('SELECT COUNT(*) FROM drivers');
        console.log(`Drivers in DB: ${driversCount.rows[0].count}`);

        const countriesCount = await db.query('SELECT COUNT(*) FROM countries');
        console.log(`Countries in DB: ${countriesCount.rows[0].count}`);

        const warehousesCount = await db.query('SELECT COUNT(*) FROM warehouses');
        console.log(`Warehouses in DB: ${warehousesCount.rows[0].count}`);

        const sampleDriver = await db.query(`
            SELECT d.name, c.name as country, w.name as warehouse 
            FROM drivers d 
            LEFT JOIN countries c ON d.country_id = c.id 
            LEFT JOIN warehouses w ON d.warehouse_id = w.id 
            LIMIT 5
        `);
        console.log('Sample Drivers:', sampleDriver.rows);

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await db.end();
    }
}

testSync();
