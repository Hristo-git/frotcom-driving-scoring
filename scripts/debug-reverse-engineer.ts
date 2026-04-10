import pool from '../lib/db';
import { ScoringEngine } from '../lib/scoring';
import { SCORING_SCALES } from '../lib/scoring-scales';

async function run() {
    const engine = new ScoringEngine();
    const start = '2026-03-01';
    const end = '2026-03-27';
    
    const drivers = [
        { id: 342, name: 'Николай', target: 4.30 },
        { id: 350, name: 'Костадин', target: 7.70 },
        { id: 346, name: 'Мартин', target: 5.40 }
    ];

    const results = [];
    for (const d of drivers) {
        const report = await engine.getDriverPerformance(start, end, { driverIds: [d.id] });
        if (report.length === 0) continue;
        results.push(report[0]);
    }

    console.log("Starting Grid Search for Weights...\n");

    const combinations = [];
    // Test Safety weight and Efficiency weight
    for (let wS = 0.5; wS <= 1.5; wS += 0.1) {
        for (let wE = 0.0; wE <= 0.5; wE += 0.05) {
            let totalDelta = 0;
            const currentScores = [];
            
            for (let i = 0; i < results.length; i++) {
                const r = results[i];
                const d = drivers[i];
                const distRatio = r.distance / 100;
                
                const s = {
                    al: engine.calculateCategoryScore((r.events.lowSpeedAcceleration || 0) / distRatio, 'harshAccelerationLow'),
                    ah: engine.calculateCategoryScore((r.events.highSpeedAcceleration || 0) / distRatio, 'harshAccelerationHigh'),
                    bl: engine.calculateCategoryScore((r.events.lowSpeedBreak || 0) / distRatio, 'harshBrakingLow'),
                    // If we distinguish switch from brake high...
                    bh: engine.calculateCategoryScore((r.events.highSpeedBreak || 0) / distRatio, 'harshBrakingHigh'),
                    sw: engine.calculateCategoryScore((r.events.accelBrakeFastShift || 0) / distRatio, 'harshBrakingHigh'), // Assuming same scale
                    cr: engine.calculateCategoryScore((r.events.lateralAcceleration || 0) / distRatio, 'harshCornering'),
                    idle: engine.calculateCategoryScore(r.idling, 'excessiveIdling'),
                    rpm: engine.calculateCategoryScore(r.rpm, 'highRPM')
                };

                const sum = (s.al + s.ah + s.bl + s.bh + s.sw + s.cr) * wS + (s.idle + s.rpm) * wE;
                const totalW = (wS * 6) + (wE * 2);
                const final = sum / totalW;
                
                totalDelta += Math.abs(final - d.target);
                currentScores.push(final.toFixed(2));
            }

            combinations.push({ wS, wE, totalDelta, scores: currentScores });
        }
    }

    combinations.sort((a, b) => a.totalDelta - b.totalDelta);

    console.log("Top 10 Weight Combinations:");
    combinations.slice(0, 10).forEach(c => {
        console.log(`SafetyW: ${c.wS.toFixed(2)} | EffW: ${c.wE.toFixed(2)} | TotalDelta: ${c.totalDelta.toFixed(3)} | Scores: ${c.scores.join(', ')}`);
    });

    console.log("\nTrying 'Step Function' (Floor) instead of interpolation...");
    // Test step function logic
    const calculateStepScore = (val: number, cat: string) => {
        if(!(cat in SCORING_SCALES)) return 10.0;
        const scale = SCORING_SCALES[cat as keyof typeof SCORING_SCALES];
        if (val <= scale[0]) return 10.0;
        if (val > scale[scale.length -1]) return 1.0;
        for (let i = 0; i < scale.length - 1; i++) {
            if (val >= scale[i] && val <= scale[i+1]) {
                return 10 - (i+1); // Return the floor score
            }
        }
        return 1.0;
    };

    let minStepDelta = 100;
    let bestStepW = { s: 0, e: 0 };
    
    for (let wS = 0.5; wS <= 1.5; wS += 0.1) {
        for (let wE = 0.0; wE <= 0.5; wE += 0.05) {
            let totalDelta = 0;
            for (let i = 0; i < results.length; i++) {
                const r = results[i];
                const d = drivers[i];
                const distRatio = r.distance / 100;
                const s = {
                    al: calculateStepScore((r.events.lowSpeedAcceleration || 0) / distRatio, 'harshAccelerationLow'),
                    ah: calculateStepScore((r.events.highSpeedAcceleration || 0) / distRatio, 'harshAccelerationHigh'),
                    bl: calculateStepScore((r.events.lowSpeedBreak || 0) / distRatio, 'harshBrakingLow'),
                    bh: calculateStepScore((r.events.highSpeedBreak || 0) / distRatio, 'harshBrakingHigh'),
                    sw: calculateStepScore((r.events.accelBrakeFastShift || 0) / distRatio, 'harshBrakingHigh'),
                    cr: calculateStepScore((r.events.lateralAcceleration || 0) / distRatio, 'harshCornering'),
                    idle: engine.calculateCategoryScore(r.idling, 'excessiveIdling'),
                    rpm: engine.calculateCategoryScore(r.rpm, 'highRPM')
                };
                const sum = (s.al + s.ah + s.bl + s.bh + s.sw + s.cr) * wS + (s.idle + s.rpm) * wE;
                const totalW = (wS * 6) + (wE * 2);
                const final = sum / totalW;
                totalDelta += Math.abs(final - d.target);
            }
            if (totalDelta < minStepDelta) {
                minStepDelta = totalDelta;
                bestStepW = { s: wS, e: wE };
            }
        }
    }
    console.log(`Best Step Function Delta: ${minStepDelta.toFixed(3)} with WS=${bestStepW.s.toFixed(2)}, WE=${bestStepW.e.toFixed(2)}`);

    await pool.end();
}

run().catch(console.error);
