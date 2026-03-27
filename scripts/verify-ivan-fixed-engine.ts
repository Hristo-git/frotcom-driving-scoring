
import { ScoringEngine } from '../lib/scoring.ts';
import pool from '../lib/db.ts';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyFinalIvan() {
    const engine = new ScoringEngine();
    // Use the period that matched 2199km (Feb 28 to Mar 15)
    const start = '2026-02-28T00:00:00Z';
    const end = '2026-03-15T23:59:59Z';
    
    console.log(`Verifying aggregated performance (Feb 28 - Mar 15)...`);
    
    const results = await engine.getDriverPerformance(start, end);
    const ivan = results.find(r => r.driverName.includes('Иван Илиев'));
    
    if (!ivan) {
        console.log("Ivan not found.");
        return;
    }
    
    console.log("\nIvan's FINAL Performance (Calculated by Engine):");
    console.log("- Score:", ivan.score);
    console.log("- Distance:", ivan.distance);
    console.log("- Idling %:", ivan.idling);
    console.log("- RPM %:", ivan.rpm);
    console.log("- Events found:", JSON.stringify(ivan.events, null, 2));
    
    console.log("\nFrotcom Dashboard Comparison:");
    console.log("- Target Score: 5.6");
    console.log("- Our Score:", ivan.score);
    console.log("- Difference:", (ivan.score - 5.6).toFixed(2));
}

verifyFinalIvan().then(() => pool.end()).catch(console.error);
