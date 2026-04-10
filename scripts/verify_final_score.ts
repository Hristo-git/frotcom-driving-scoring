import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const engine = new ScoringEngine(pool as any);
    
    // Добромир Димитров ID = 13 (Internal)
    const start = '2026-03-01';
    const end = '2026-03-31';

    console.log(`Testing dashboard score for driver 13 from ${start} to ${end}...`);
    try {
        const results = await engine.getDriverPerformance(start, end, { driverIds: [13] });
        if (results.length > 0) {
            console.log('Driver Found:', JSON.stringify(results[0], null, 2));
        } else {
            console.log('Driver not found.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();
