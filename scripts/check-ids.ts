
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkIds() {
    try {
        const plates = [
            'CB1786ME', 'CB6311CE', 'CB6820HE', // Latin
            'СВ1786МЕ', 'СВ6311СЕ', 'СВ6820НЕ'  // Cyrillic
        ];
        const res = await pool.query(
            "SELECT id, frotcom_id, license_plate FROM vehicles WHERE license_plate = ANY($1)",
            [plates]
        );
        console.log('Vehicles:', res.rows);
        
        const driverRes = await pool.query(
            "SELECT id, frotcom_id, name FROM drivers WHERE name ILIKE '%Николай Красимиров Костадинов%'"
        );
        console.log('Drivers:', driverRes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkIds();
