
import { ScoringEngine, DEFAULT_WEIGHTS } from '../lib/scoring.js';

async function test() {
    const engine = new ScoringEngine();
    
    // Nikolai's stats from previous logs:
    // Dist: 2692.4km
    // Events: 
    //   harshAccelerationLow: 5
    //   harshAccelerationHigh: 0
    //   harshBrakingLow: 23
    //   harshBrakingHigh: 0
    //   harshCornering: 1
    //   highRPM: 38
    
    const metrics = {
        mileage: 2692.4,
        eventCounts: {
            lowSpeedAcceleration: 5,
            lowSpeedBreak: 23,
            lateralAcceleration: 1,
            highRPM: 38
        }
    };

    const weights = { ...DEFAULT_WEIGHTS };
    // Set weights to 1.0 / 1.5 as they were in d18ffe4
    weights.harshAccelerationLow = 1.0;
    weights.harshAccelerationHigh = 1.5;
    weights.harshBrakingLow = 1.0;
    weights.harshBrakingHigh = 1.5;
    weights.harshCornering = 1.2;
    weights.highRPM = 0.1; // What I used in bd0cd47

    console.log("Testing with K=0.31 (single count equivalent of old K=0.155 double count)");
    (engine as any).K = 0.31;
    const score31 = (engine as any).calculateCustomScore(metrics, weights);
    console.log(`Nikolai Score (K=0.31): ${score31.toFixed(2)}`);

    console.log("Testing with K=0.23 (my pushed version)");
    (engine as any).K = 0.23;
    const score23 = (engine as any).calculateCustomScore(metrics, weights);
    console.log(`Nikolai Score (K=0.23): ${score23.toFixed(2)}`);
}

test();
