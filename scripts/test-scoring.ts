
import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testScoring() {
    console.log('Testing Scoring Engine...');
    const engine = new ScoringEngine();
    // await engine.connect();

    const start = '2026-02-01T00:00:00';
    const end = '2026-02-07T23:59:59';

    try {
        console.log('--- Country Performance ---');
        const countries = await engine.getCountryPerformance(start, end);
        console.table(countries);

        console.log('\n--- Warehouse Performance ---');
        const warehouses = await engine.getWarehousePerformance(start, end);
        console.table(warehouses);

        console.log('\n--- Top 5 Drivers ---');
        const drivers = await engine.getDriverPerformance(start, end);
        console.table(drivers.slice(0, 5));

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await pool.end();
    }
}

testScoring();
