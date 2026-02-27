
import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugCB1783ME() {
    const start = '2026-02-14T00:00:00';
    const end = '2026-02-14T23:59:59';

    console.log('Fetching all records for Feb 14...');
    const results = await FrotcomClient.calculateEcodriving(start, end);

    // All records for vehicle CB1783ME
    const vehicleRecords = results.filter((r: any) => r.licensePlate === 'CB1783ME');
    console.log(`\nTotal API records for CB1783ME: ${vehicleRecords.length}`);
    vehicleRecords.forEach((r: any, i: number) => {
        console.log(`\n--- Record ${i + 1} ---`);
        console.log(JSON.stringify(r, null, 2));
    });

    // Check: how many records have driversId=[0] (no driver assigned)?
    const noDriverRecords = results.filter((r: any) =>
        r.driversId && r.driversId.length === 1 && r.driversId[0] === 0 &&
        r.mileageCanbus > 50
    );
    console.log(`\n\nRecords with driversId=[0] (unassigned) and mileageCanbus > 50km: ${noDriverRecords.length}`);
    noDriverRecords.slice(0, 5).forEach((r: any) => {
        console.log(`  plate=${r.licensePlate}, canbus=${r.mileageCanbus}, gps=${r.mileageGps}`);
    });

    // Key question: does the 464km trip show up as a separate record with driversId including 308019?
    // Or is it a record with driversId=[0]?
    // Let's look for any CB1783ME record with high mileage
    console.log('\n\nAll records with licensePlate containing "1783":');
    const anyMatch = results.filter((r: any) => r.licensePlate && r.licensePlate.includes('1783'));
    anyMatch.forEach((r: any) => {
        console.log(`  plate=${r.licensePlate}, driversId=${JSON.stringify(r.driversId)}, canbus=${r.mileageCanbus}, gps=${r.mileageGps}`);
    });

    // Summarize total fleet mileage in API vs what we have in DB
    let apiFleetCanbus = 0;
    results.forEach((r: any) => { apiFleetCanbus += r.mileageCanbus || 0; });
    console.log(`\nTotal API fleet mileageCanbus for Feb 14: ${apiFleetCanbus.toFixed(0)} km`);

    const dbRes = await pool.query(`
        SELECT SUM((metrics->>'mileageCanbus')::numeric) as total_canbus
        FROM ecodriving_scores WHERE period_start = '2026-02-14T00:00:00'
    `);
    console.log(`Total DB fleet mileageCanbus for Feb 14: ${Math.round(dbRes.rows[0].total_canbus)} km`);
    console.log(`\n>> If these differ, there are API records not being stored (driversId = 0 or unknown driver).`);

    await pool.end();
}

debugCB1783ME().catch(console.error);
