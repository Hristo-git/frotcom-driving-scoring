
import pool from '../lib/db';
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugZhivkoIvanov() {
    // 1. Find driver in DB
    const dbRes = await pool.query(`
        SELECT d.id, d.name, d.frotcom_id,
          es.metrics->>'mileage' as mileage,
          es.metrics->>'mileageCanbus' as canbus,
          es.metrics->>'mileageGps' as gps,
          es.overall_score, es.period_start
        FROM drivers d
        LEFT JOIN ecodriving_scores es ON es.driver_id = d.id AND es.period_start = '2026-02-14T00:00:00'
        WHERE d.name ILIKE '%Живко%Иванов%' OR d.name ILIKE '%Zhivko%Ivanov%'
        ORDER BY d.name
    `);
    console.log('\n=== Driver(s) matching "Живко Иванов" in DB ===');
    console.table(dbRes.rows);

    // Get frotcom IDs to check in API
    const frotcomIds = dbRes.rows.map((r: any) => parseInt(r.frotcom_id)).filter(Boolean);
    console.log('\nFrotcom IDs:', frotcomIds);

    if (frotcomIds.length === 0) {
        console.log('No driver found in DB! Check sync.');
        await pool.end();
        return;
    }

    // 2. Check raw API for Feb 14
    console.log('\n=== Raw API records for Feb 14 matching these driver IDs ===');
    const results = await FrotcomClient.calculateEcodriving('2026-02-14T00:00:00', '2026-02-14T23:59:59');

    for (const fId of frotcomIds) {
        const matches = results.filter((r: any) => r.driversId && r.driversId.includes(fId));
        console.log(`\nFrotcom ID ${fId}: ${matches.length} API records`);
        matches.forEach((m: any, i: number) => {
            const mileage = (m.mileageCanbus && m.mileageCanbus > 0) ? m.mileageCanbus : (m.mileageGps || 0);
            console.log(`  Record ${i + 1}: plate=${m.licensePlate}, mileageCanbus=${m.mileageCanbus}, mileageGps=${m.mileageGps}, computed=${mileage}`);
        });
    }

    // Frotcom report shows CB1783ME = 464 CANBus, 455 GPS
    // Check that vehicle's record
    console.log('\n=== Vehicle CB1783ME record in API ===');
    const cb1783 = results.filter((r: any) => r.licensePlate === 'CB1783ME');
    cb1783.forEach((r: any) => {
        console.log(JSON.stringify({
            licensePlate: r.licensePlate,
            drivers: r.drivers,
            driversId: r.driversId,
            mileageCanbus: r.mileageCanbus,
            mileageGps: r.mileageGps,
            hasLowMileage: r.hasLowMileage,
            drivingTime: r.drivingTime,
            score: r.score
        }, null, 2));
    });

    await pool.end();
}

debugZhivkoIvanov().catch(console.error);
