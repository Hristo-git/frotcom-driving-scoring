
import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyIvanAggregate() {
    const engine = new ScoringEngine();
    const start = '2026-03-01T00:00:00Z';
    const end = '2026-03-15T23:59:59Z';
    
    console.log(`Calculating performance for period: ${start} to ${end}`);
    
    const results = await engine.getDriverPerformance(start, end);
    const ivan = results.find(r => r.driverName.includes('Иван Илиев'));
    
    if (!ivan) {
        console.log("Ivan not found in performance results.");
        return;
    }
    
    console.log("\nIvan's Aggregate Performance:");
    console.log(JSON.stringify(ivan, null, 2));
    
    console.log("\nFrotcom Dashboard Score: 5.6");
    console.log("Internal System Score:", ivan.score);
    console.log("Difference:", Math.abs(ivan.score - 5.6).toFixed(2));
}

verifyIvanAggregate().then(() => pool.end()).catch(console.error);
