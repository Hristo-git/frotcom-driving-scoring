
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugMiroslav() {
    const name = 'Мирослав Владимиров Урдарски - Столник';
    console.log(`Checking data for: ${name}`);

    try {
        const driverRes = await pool.query("SELECT id, name FROM drivers WHERE name ILIKE '%Miroslav%Urdarski%'");
        console.log('Searching for Miroslavs:');
        console.table(driverRes.rows);

        for (const dr of driverRes.rows) {
            const driverId = dr.id;
            console.log(`\n--- Checking events for ${dr.name} (ID: ${driverId}) ---`);

            const evRes = await pool.query(`
            SELECT event_type, count(*) 
            FROM ecodriving_events 
            WHERE driver_id = $1 
            AND DATE(started_at AT TIME ZONE 'Europe/Sofia') >= '2026-02-20'
            GROUP BY event_type, DATE(started_at AT TIME ZONE 'Europe/Sofia')
            ORDER BY DATE(started_at AT TIME ZONE 'Europe/Sofia')
          `, [driverId]);

            console.table(evRes.rows);
        }

        return;

        const startDate = '2026-02-01';
        const endDate = '2026-02-28';

        const scoresRes = await pool.query(`
      SELECT id, DATE(period_start AT TIME ZONE 'Europe/Sofia') as date, metrics 
      FROM ecodriving_scores 
      WHERE driver_id = $1 
      AND DATE(period_start AT TIME ZONE 'Europe/Sofia') >= $2
      AND DATE(period_start AT TIME ZONE 'Europe/Sofia') <= $3
      ORDER BY period_start ASC
    `, [driverId, startDate, endDate]);

        console.log(`Found ${scoresRes.rows.length} score records for Feb 2026`);

        const checkDate = '2026-02-24';
        const evRes = await pool.query(`
          SELECT event_type, count(*) 
          FROM ecodriving_events 
          WHERE driver_id = $1 
          AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
          GROUP BY event_type
        `, [driverId, checkDate]);

        console.log(`\nEvents found for driver ${driverId} on ${checkDate}:`);
        console.table(evRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit();
    }
}

debugMiroslav();
