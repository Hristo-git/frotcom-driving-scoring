
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function getEventStats(search: string) {
    try {
        const query = `
            SELECT 
                d.name,
                SUM((es.metrics->'eventCounts'->>'lowSpeedAcceleration')::int) as harsh_accel_low,
                SUM((es.metrics->'eventCounts'->>'highSpeedAcceleration')::int) as harsh_accel_high,
                SUM((es.metrics->'eventCounts'->>'lowSpeedBreak')::int) as harsh_brake_low,
                SUM((es.metrics->'eventCounts'->>'highSpeedBreak')::int) as harsh_brake_high,
                SUM((es.metrics->'eventCounts'->>'lateralAcceleration')::int) as cornering,
                SUM((es.metrics->'eventCounts'->>'idling')::int) as excessive_idling,
                SUM((es.metrics->'eventCounts'->>'highRPM')::int) as high_rpm,
                SUM((es.metrics->>'mileage')::numeric) as total_km
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE d.name ILIKE $1
              AND es.period_start >= '2026-02-01'
              AND es.period_end <= '2026-02-28 23:59:59'
            GROUP BY d.name
        `;
        const res = await pool.query(query, [`%${search}%`]);
        return res.rows;
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function main() {
    const drivers = ['Марјан Трајковски', 'Марјан Стефановски'];
    const summary = [];

    for (const d of drivers) {
        const stats = await getEventStats(d);
        if (stats.length > 0) {
            summary.push(stats[0]);
        }
    }

    console.log("EVENT_SUMMARY_FEBRUARY");
    console.table(summary);

    await pool.end();
}

main();
