
import pool from '../lib/db';
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifySpecifics() {
    try {
        const tests = [
            {
                label: "Kostadin Lubenov Chotrev - Столник",
                date: "2026-02-28",
                frotcomId: 297309,
                expected: { mileage: 258.2, score: 6.7, time: "5:29", fuel: 15.49 }
            },
            {
                label: "Hristo Tsvetev Petrov - Ямбол",
                date: "2026-03-02",
                frotcomId: 283043,
                expected: { mileage: 250.5, score: 8.6, time: "3:15", fuel: 18.56 }
            }
        ];

        console.log("\n--- Comparison Results ---");
        for (const test of tests) {
            const s = `${test.date}T00:00:00`;
            const e = `${test.date}T23:59:59`;

            console.log(`\nChecking ${test.label} on ${test.date} (Frotcom ID: ${test.frotcomId})`);
            console.log(`Expected (Screenshot): ${test.expected.mileage}km, ${test.expected.score} pts, ${test.expected.time} time, ${test.expected.fuel} L/100km`);

            // 1. Check API (Fixed method)
            const apiRes = await FrotcomClient.calculateEcodriving(s, e, [test.frotcomId], undefined, 'driver');
            const apiItem = apiRes.find(r => r.driverId === test.frotcomId);

            if (apiItem) {
                const consumption = apiItem.mileage > 0 ? (apiItem.totalConsumption / apiItem.mileage) * 100 : 0;
                console.log("  API Data:");
                console.log(`    Mileage: ${apiItem.mileage} km`);
                console.log(`    Driving Time: ${Math.floor(apiItem.drivingTime / 3600)}:${Math.floor((apiItem.drivingTime % 3600) / 60).toString().padStart(2, '0')}`);
                console.log(`    Score: ${apiItem.score}`);
                console.log(`    Fuel: ${consumption.toFixed(2)} L/100km`);
            } else {
                console.log("  API Data: NOT FOUND");
            }

            // 2. Check Database
            const dbRes = await pool.query(`
                SELECT * FROM ecodriving_scores 
                WHERE period_start = $1 AND period_end = $2
                  AND driver_id = (SELECT id FROM drivers WHERE frotcom_id = $3)
            `, [s, e, test.frotcomId.toString()]);

            if (dbRes.rows.length > 0) {
                const dbItem = dbRes.rows[0];
                const metrics = dbItem.metrics || {};
                console.log("  Database Data:");
                console.log(`    Mileage: ${metrics.mileage} km`);
                console.log(`    Overall Score: ${dbItem.overall_score}`);
                console.log(`    Avg Consumption: ${metrics.averageConsumption?.toFixed(2)} L/100km`);
            } else {
                console.log("  Database Data: NOT FOUND");
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifySpecifics();
