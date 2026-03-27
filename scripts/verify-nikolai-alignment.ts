
import { ScoringEngine, DEFAULT_WEIGHTS } from '../lib/scoring';
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
    const start = '2026-03-01';
    const end = '2026-03-15';
    
    const report = await engine.getDriverPerformance(start, end, { 
        weights: DEFAULT_WEIGHTS 
    });
    
    const petrichDrivers = report.filter(d => d.driverName.includes('Петрич'));
    
    console.log(`\n--- Petrič Results with Metrics ---`);
    petrichDrivers
        .sort((a, b) => b.score - a.score)
        .forEach((d, i) => {
            console.log(`${i+1}. ${d.driverName}: Score=${d.score.toFixed(2)}, Idling=${d.idling.toFixed(1)}%, RPM=${d.rpm.toFixed(1)}% (${d.distance} km)`);
        });

    await pool.end();
}

verify();
