
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function getDetailedEvents(name: string) {
    const res = await pool.query(`
        SELECT 
            event_type,
            COUNT(*) as count
        FROM ecodriving_events e
        JOIN drivers d ON e.driver_id = d.id
        WHERE d.name ILIKE $1
          AND e.started_at >= '2026-02-01'
          AND e.started_at <= '2026-02-28 23:59:59'
        GROUP BY event_type
        ORDER BY count DESC
    `, [`%${name}%`]);
    return res.rows;
}

async function getMileage(name: string) {
    const res = await pool.query(`
        SELECT SUM((metrics->>'mileage')::numeric) as total_km
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name ILIKE $1
          AND es.period_start >= '2026-02-01'
          AND es.period_end <= '2026-02-28 23:59:59'
    `, [`%${name}%`]);
    return parseFloat(res.rows[0].total_km);
}

async function main() {
    const drivers = ['Марјан Трајковски', 'Марјан Стефановски'];

    for (const d of drivers) {
        console.log(`\n--- ${d} ---`);
        const events = await getDetailedEvents(d);
        const km = await getMileage(d);

        console.log(`Total Distance: ${km.toFixed(1)} km`);
        console.table(events.map(ev => ({
            type: ev.event_type,
            count: parseInt(ev.count),
            per_100km: (parseInt(ev.count) / (km / 100)).toFixed(2)
        })));
    }

    await pool.end();
}

main();
