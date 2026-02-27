import { ScoringEngine } from '../lib/scoring';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const engine = new ScoringEngine();
    const result = await engine.getCountryPerformance('2026-01-01', '2026-02-28');
    console.log(result.map(r => r.name));
}
main().catch(console.error);
