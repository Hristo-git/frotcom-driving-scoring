import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkVehicle() {
    try {
        const query = `
            SELECT id, frotcom_id, license_plate 
            FROM vehicles 
            WHERE license_plate = 'CB6357BE'
        `;
        const { rows } = await pool.query(query);
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkVehicle();
