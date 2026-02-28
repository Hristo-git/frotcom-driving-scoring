import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkDate() {
    try {
        // Sofia date Feb 27th is usually stored as UTC Feb 26th 22:00
        const query = `
            SELECT count(*), 
                   MIN(period_start) as min_start, 
                   MAX(period_end) as max_end,
                   DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as sofia_day
            FROM ecodriving_scores
            WHERE (period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia' >= '2026-02-26'
            GROUP BY sofia_day
            ORDER BY sofia_day DESC;
        `;
        const { rows } = await pool.query(query);
        console.log("Record counts by Sofia day (post-Feb 26):");
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkDate();
