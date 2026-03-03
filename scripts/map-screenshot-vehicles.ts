
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function mapVehicles() {
    const plates = [
        'CB1739ME', 'CB1785ME', 'CB2549TT', 'CB3094AO', 'CB3095AO',
        'CB3096AO', 'CB6354BE', 'CB6369BE', 'CB6810HE', 'CB7142KE',
        'CB7143KE', 'CB8568PE', 'CB8875HO', 'CB9672EO'
    ];

    try {
        const res = await pool.query(
            `SELECT license_plate, frotcom_id FROM vehicles WHERE license_plate = ANY($1)`,
            [plates]
        );
        console.table(res.rows);
    } catch (e: any) {
        console.error(e.message);
    } finally {
        await pool.end();
    }
}
mapVehicles();
