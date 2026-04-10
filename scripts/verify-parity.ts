import { ScoringEngine } from '../lib/scoring';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verify() {
    const engine = new ScoringEngine();
    const start = '2026-04-01';
    const end = '2026-04-10';

    console.log(`Verifying aggregation for period: ${start} to ${end}`);
    
    // This will now use the new _getDriverPerformanceFromDailyDB logic
    const report = await engine.getDriverPerformance(start, end);

    const martin = report.find(d => d.driverId === 346);
    const kostadin = report.find(d => d.driverId === 95); // ID for Kostadin Aklashev based on previous logs

    if (martin) {
        console.log(`\nMartin Todorov (ID 346):`);
        console.log(`  Distance: ${martin.distance} km (Expected ~1374)`);
        console.log(`  Score:    ${martin.score} (Frotcom: 5.9, Old Dashboard: 6.60)`);
        console.log(`  Events:`, martin.events);
    } else {
        console.log('Martin Todorov not found in report');
    }

    if (kostadin) {
        console.log(`\nKostadin Aklashev (ID 95):`);
        console.log(`  Distance: ${kostadin.distance} km (Expected ~2667)`);
        console.log(`  Score:    ${kostadin.score} (Frotcom: 7.8, Old Dashboard: 7.59)`);
    }

    process.exit(0);
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
