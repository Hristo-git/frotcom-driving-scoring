
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function inspectData() {
    try {
        console.log('Querying recent ecodriving scores...');
        const res = await pool.query(
            `SELECT metrics 
             FROM ecodriving_scores 
             LIMIT 1`
        );

        if (res.rows.length > 0) {
            console.log('Full metrics JSON:', JSON.stringify(res.rows[0].metrics, null, 2));
        } else {
            console.log('No records found.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

inspectData();
