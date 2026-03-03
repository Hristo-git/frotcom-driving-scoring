
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugKostadin() {
    try {
        console.log('Searching for Kostadin...');
        const driverRes = await pool.query("SELECT id, name FROM drivers WHERE name ILIKE '%Chotrev%' OR name ILIKE '%Kostadin%Lubenov%'");
        if (driverRes.rows.length === 0) {
            console.log('Driver not found');
            return;
        }

        const driver = driverRes.rows[0];
        console.log(`Found driver: ${driver.name} (ID: ${driver.id})`);

        console.log('\nChecking ecodriving_scores for the last 35 days...');
        const scoresRes = await pool.query(`
            SELECT 
                period_start,
                overall_score,
                metrics->>'score' as frotcom_score,
                metrics->>'scoreCustomized' as frotcom_custom_score,
                metrics->>'mileage' as mileage,
                metrics->>'drivingTime' as driving_time,
                metrics->>'failingCriteria' as criteria
            FROM ecodriving_scores
            WHERE driver_id = $1
            AND period_start >= NOW() - INTERVAL '35 days'
            ORDER BY period_start DESC
        `, [driver.id]);

        console.table(scoresRes.rows);

        // Calculate aggregate same as Dashboard
        let totalWeightedScore = 0;
        let totalWeight = 0;
        let totalDist = 0;
        let totalTime = 0;

        scoresRes.rows.forEach(row => {
            const score = parseFloat(row.overall_score);
            const dist = parseFloat(row.mileage);
            const time = parseFloat(row.driving_time);

            if (dist > 0) {
                totalWeightedScore += score * dist;
                totalWeight += dist;
            }
            totalDist += dist;
            totalTime += time;
        });

        const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        console.log('\nAggregate (Last 35 days):');
        console.log(`Avg Score: ${avgScore.toFixed(2)}`);
        console.log(`Total Distance: ${totalDist.toFixed(1)} km`);
        console.log(`Total Time: ${(totalTime / 3600).toFixed(1)} h`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugKostadin();
