
import { syncDriversAndVehicles } from '../lib/sync';
import pool from '../lib/db';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    try {
        await syncDriversAndVehicles();
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
