
import { ScoringEngine } from '../lib/scoring';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const engine = new ScoringEngine();
    const start = '2026-02-27T00:00:00Z';
    const end = '2026-02-27T23:59:59Z';

    console.log(`Fetching performance for ${start} to ${end}...`);
    const drivers = await engine.getDriverPerformance(start, end);

    const krasimir = drivers.find(d => d.driverId === 371);
    if (krasimir) {
        console.log('Krasimir Boianov found:');
        console.log('Score:', krasimir.score);
        console.log('Events:', JSON.stringify(krasimir.events, null, 2));
    } else {
        console.log('Krasimir Boianov (ID 371) not found in the results.');
    }

    // Also check Todor Ivanov (ID 279) who we know has events
    const todor = drivers.find(d => d.driverId === 279);
    if (todor) {
        console.log('\nTodor Ivanov found:');
        console.log('Score:', todor.score);
        console.log('Events:', JSON.stringify(todor.events, null, 2));
    }

    process.exit(0);
}

main().catch(console.error);
