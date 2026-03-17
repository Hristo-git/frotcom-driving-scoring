
import { ScoringEngine } from '../lib/scoring';
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    const engine = new ScoringEngine();
    const driverId = 342;
    const start = '2026-03-01';
    const end = '2026-03-15';
    
    // Pass the driverId to the options to ensure we only get his data
    const report = await engine.getDriverPerformance(start, end, { driverIds: [driverId] });
    const nikolai = report.find(r => r.driverId === driverId);
    
    if (nikolai) {
        console.log(`Nikolai's Verified Score: ${nikolai.score}`);
        console.log(`Total Distance: ${nikolai.distance} km`);
        console.log(`Target: 4.1`);
    } else {
        console.log('Nikolai not found in the report period.');
        // List all drivers found to help debug
        console.log('Drivers found in report:', report.map(r => `${r.driverName} (ID: ${r.driverId})`).join(', '));
    }
    
    await pool.end();
}

verify();
