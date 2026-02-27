import * as dotenv from 'dotenv';
import { ScoringEngine } from '../lib/scoring';

dotenv.config({ path: '.env.local' });

async function main() {
    const engine = new ScoringEngine();

    try {
        console.log("Starting DB query...");

        const start = new Date('2026-02-01T00:00:00Z');
        const end = new Date('2026-02-28T23:59:59Z');

        console.log(`Fetching vehicle performance for ${start.toISOString()} to ${end.toISOString()}...`);

        // Use default weights from lib/scoring.ts
        const defaultWeights = {
            harshAccelerationLow: 1, harshAccelerationHigh: 2,
            harshBrakingLow: 1, harshBrakingHigh: 2, harshCornering: 2,
            accelBrakeSwitch: 1.5, excessiveIdling: 0.5, highRPM: 1,
            alarms: 3, noCruiseControl: 0.2, accelDuringCruise: 0.5
        };

        const result = await engine.getVehiclePerformance(
            start.toISOString(),
            end.toISOString(),
            { weights: defaultWeights }
        );

        console.log(`Found ${result.length} vehicles.`);
        console.log(JSON.stringify(result.slice(0, 3), null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

main().catch(console.error);
