
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function analyzeDriver(search: string, expectedScore: number, expectedKm: number) {
    try {
        const drivers = await pool.query('SELECT id, name FROM drivers WHERE name ILIKE $1', [`%${search}%`]);
        if (drivers.rows.length === 0) {
            return { name: search, error: 'Not found' };
        }

        const driver = drivers.rows[0];
        const res = await pool.query(`
            SELECT 
                overall_score,
                (metrics->>'mileage')::numeric as mileage
            FROM ecodriving_scores
            WHERE driver_id = $1
              AND period_start >= '2026-02-01'
              AND period_end <= '2026-02-28 23:59:59'
        `, [driver.id]);

        const validRows = res.rows.filter(r => parseFloat(r.mileage) > 0.1);
        const totalDistance = validRows.reduce((acc, r) => acc + parseFloat(r.mileage), 0);

        if (totalDistance === 0) {
            return { name: driver.name, error: 'No mileage' };
        }

        const weightedSum = validRows.reduce((acc, r) => acc + (parseFloat(r.overall_score) * parseFloat(r.mileage)), 0);
        const weightedAvg = weightedSum / totalDistance;

        // Simple avg as currently implemented in the app (but usually we do count-based average)
        const simpleAvg = validRows.reduce((acc, r) => acc + (parseFloat(r.overall_score) || 0), 0) / validRows.length;

        return {
            name: driver.name,
            frotcomWeb: expectedScore,
            frotcomKm: expectedKm,
            calculatedKm: parseFloat(totalDistance.toFixed(1)),
            simpleAvg: parseFloat(simpleAvg.toFixed(2)),
            weightedAvg: parseFloat(weightedAvg.toFixed(2)),
            diff: Math.abs(weightedAvg - expectedScore).toFixed(2)
        };

    } catch (err) {
        return { name: search, error: (err as Error).message };
    }
}

async function main() {
    const targets = [
        { name: 'Спасовски', score: 8.4, km: 994.0 },
        { name: 'Трајковски', score: 7.9, km: 2992.0 },
        { name: 'Марјан Стефановски', score: 7.6, km: 3022.0 },
        { name: 'Бобан Андреевски', score: 7.5, km: 1278.0 },
        { name: 'Димишковска', score: 6.9, km: 2674.0 },
        { name: 'Злате Вујовски', score: 6.5, km: 3300.0 },
        { name: 'Игор Блажевски', score: 6.3, km: 3771.0 },
        { name: 'Александар Стефановски', score: 6.1, km: 3043.0 }
    ];

    console.log("Starting full validation...\n");
    const results = [];
    for (const t of targets) {
        results.push(await analyzeDriver(t.name, t.score, t.km));
    }

    console.table(results);
    await pool.end();
}

main();
