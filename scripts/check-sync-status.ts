
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkLastNightSync() {
    try {
        const dateToCheck = '2026-03-02';

        console.log(`Checking ecodriving data for: ${dateToCheck}`);

        const scoresRes = await pool.query(
            `SELECT COUNT(*) as count FROM ecodriving_scores WHERE period_start >= $1 AND period_end <= $2`,
            [`${dateToCheck} 00:00:00`, `${dateToCheck} 23:59:59`]
        );
        console.log(`Ecodriving Scores count: ${scoresRes.rows[0].count}`);

        const eventsRes = await pool.query(
            `SELECT COUNT(*) as count FROM ecodriving_events WHERE started_at >= $1 AND started_at <= $2`,
            [`${dateToCheck} 00:00:00`, `${dateToCheck} 23:59:59`]
        );
        console.log(`Ecodriving Events count: ${eventsRes.rows[0].count}`);

    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
checkLastNightSync();
