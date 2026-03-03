
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function analyzeDriver(name: string) {
    try {
        console.log(`Searching for: ${name}`);
        const drivers = await pool.query('SELECT id, name, frotcom_id FROM drivers WHERE name ILIKE $1', [`%${name}%`]);
        console.log("Matching drivers:", drivers.rows);

        for (const driver of drivers.rows) {
            const driverId = driver.id;
            const res = await pool.query(`
                SELECT 
                    period_start::date as date,
                    overall_score,
                    (metrics->>'mileage')::numeric as mileage
                FROM ecodriving_scores
                WHERE driver_id = $1
                  AND period_start >= '2026-02-01'
                  AND period_end <= '2026-02-28 23:59:59'
                ORDER BY period_start
            `, [driverId]);

            console.log(`\nDaily Data for ${driver.name} (ID: ${driverId}):`);
            console.table(res.rows.map(r => ({
                ...r,
                overall_score: parseFloat(r.overall_score),
                mileage: parseFloat(r.mileage)
            })));

            const totalDistance = res.rows.reduce((acc, r) => acc + parseFloat(r.mileage), 0);
            const validScores = res.rows.filter(r => parseFloat(r.mileage) > 0.1);

            if (validScores.length === 0) {
                console.log("No significant mileage recorded.");
                continue;
            }

            const simpleAvg = validScores.reduce((acc, r) => acc + parseFloat(r.overall_score), 0) / validScores.length;
            const weightedAvg = validScores.reduce((acc, r) => acc + (parseFloat(r.overall_score) * parseFloat(r.mileage)), 0) / totalDistance;

            console.log(`Total Distance: ${totalDistance.toFixed(1)} km`);
            console.log(`Simple Avg Score: ${simpleAvg.toFixed(2)}`);
            console.log(`Weighted Avg Score: ${weightedAvg.toFixed(2)}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyzeDriver('Марјан Стефановски');
analyzeDriver('Марјан Трајковски');
analyzeDriver('Бобан Андреевски');
analyzeDriver('Злате Вујовски');
