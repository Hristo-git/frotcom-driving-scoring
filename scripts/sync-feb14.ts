import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function syncFeb14() {
    console.log('Fetching for Feb 14 using the new group_by logic...');
    try {
        await fetchAndStoreEcodriving('2026-02-14T00:00:00', '2026-02-14T23:59:59');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

syncFeb14();
