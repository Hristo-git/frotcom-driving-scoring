import pool from '../lib/db';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkVehicles() {
    try {
        console.log('Querying vehicles table for metadata...');
        const res = await pool.query('SELECT license_plate, metadata FROM vehicles LIMIT 5');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkVehicles();
