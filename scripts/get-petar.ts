import pool from '../lib/db';
import { ScoringEngine, DEFAULT_WEIGHTS, ScoringWeights } from '../lib/scoring';

// Frotcom scores from screenshot (Петрич, Mar 1-25 2026)
const FROTCOM_SCORES: Record<string, number> = {
    'Stefan Serafimov':            9.0,
    'Костадин Ангелов Аклашев':    7.9,
    'Martin Todorov':              7.1,
    'Петър Стоянов Митов':         7.4,
    'Petar Yanchev Boychev':       6.6,
    'Стефан Антонов Серафимов':    6.3,
    'Иван Илиев Илиев':            6.3,
    'Иван Владимиров Мирчев':      6.7,
    'Мартин Данаилов Костадинов':  6.8,
    'Благой Георгиев Тодоров':     5.5,
    'Мартин Николаев Тодоров':     5.4,
    'Христо Борисов Бараков':      5.1,
    'Любен Василев':               4.0,
    'Lyuben Vasilev':              4.6,
    'Димитър Милков Атанасов':     4.5,
    'Николай Красимиров Костадинов': 4.3,
    'Живко Георгиев Иванов':       4.3,
    'Валтол Методиев Китанов':     4.1,
    'Имен Хаджикантелов':          3.7,
};

function fuzzyMatch(name: string): number | null {
    for (const [key, val] of Object.entries(FROTCOM_SCORES)) {
        // Match by partial name (first/last word)
        const keyWords = key.toLowerCase().split(/\s+/);
        const nameWords = name.toLowerCase().split(/\s+/);
        const matched = keyWords.filter(w => nameWords.some(n => n.includes(w) || w.includes(n)));
        if (matched.length >= 2) return val;
    }
    return null;
}

function calcScore(events: Record<string,number>, dist: number, idling: number, rpm: number, weights: ScoringWeights): number {
    if (dist < 0.1) return 10;
    const THRESHOLDS: Record<string, {max: number, score: number}[]> = {
        harshAccelerationLow: [
            { max: 0.08, score: 10 }, { max: 0.35, score: 9 }, { max: 0.80, score: 8 },
            { max: 1.30, score: 7 }, { max: 2.00, score: 6 }, { max: 2.85, score: 5 },
            { max: 3.85, score: 4 }, { max: 5.50, score: 3 }, { max: 9.00, score: 2 }
        ],
        harshAccelerationHigh: [
            { max: 0.03, score: 10 }, { max: 0.08, score: 9 }, { max: 0.20, score: 8 },
            { max: 0.28, score: 7 }, { max: 0.45, score: 6 }, { max: 0.65, score: 5 },
            { max: 1.15, score: 4 }, { max: 1.60, score: 3 }, { max: 2.65, score: 2 }
        ],
        harshBrakingLow: [
            { max: 0.30, score: 10 }, { max: 0.80, score: 9 }, { max: 1.35, score: 8 },
            { max: 1.75, score: 7 }, { max: 2.30, score: 6 }, { max: 3.00, score: 5 },
            { max: 3.90, score: 4 }, { max: 4.90, score: 3 }, { max: 7.50, score: 2 }
        ],
        harshBrakingHigh: [
            { max: 0.05, score: 10 }, { max: 0.10, score: 9 }, { max: 0.19, score: 8 },
            { max: 0.30, score: 7 }, { max: 0.42, score: 6 }, { max: 0.56, score: 5 },
            { max: 0.83, score: 4 }, { max: 1.21, score: 3 }, { max: 1.90, score: 2 }
        ],
        harshCornering: [
            { max: 0.25, score: 10 }, { max: 1.20, score: 9 }, { max: 3.85, score: 8 },
            { max: 7.70, score: 7 }, { max: 13.70, score: 6 }, { max: 19.70, score: 5 },
            { max: 23.50, score: 4 }, { max: 35.20, score: 3 }, { max: 45.00, score: 2 }
        ]
    };
    const getT = (cat: string, v: number) => {
        const t = THRESHOLDS[cat];
        if (!t) return 10;
        for (const e of t) if (v <= e.max) return e.score;
        return 1;
    };
    const d100 = dist / 100;
    let tw = 0, ws = 0;
    const at = (w: number, count: number, cat: string) => { if (w > 0) { tw += w; ws += w * getT(cat, count/d100); } };
    const al = (w: number, v: number, sev: number) => { if (w > 0) { const s = Math.max(1, Math.min(10, 10 - v*sev)); tw += w; ws += w * s; } };
    at(weights.harshAccelerationLow, events.lowSpeedAcceleration||0, 'harshAccelerationLow');
    at(weights.harshAccelerationHigh, events.highSpeedAcceleration||0, 'harshAccelerationHigh');
    at(weights.harshBrakingLow, events.lowSpeedBreak||0, 'harshBrakingLow');
    at(weights.harshBrakingHigh, events.highSpeedBreak||0, 'harshBrakingHigh');
    at(weights.harshCornering, events.lateralAcceleration||0, 'harshCornering');
    al(weights.accelBrakeSwitch, (events.accelBrakeFastShift||0)/d100, 0.5);
    al(weights.noCruiseControl, (events.noCruise||0)/d100, 0.1);
    al(weights.excessiveIdling, idling, 0.5);
    al(weights.highRPM, rpm, 1.0);
    if (tw === 0) return 10;
    return parseFloat(Math.max(1, Math.min(10, ws/tw)).toFixed(2));
}

async function main() {
    const START = '2026-03-01T00:00:00Z';
    const END = '2026-03-25T23:59:59Z';

    const engine = new ScoringEngine();

    const weightsDefault = { ...DEFAULT_WEIGHTS };
    const weightsABS04 = { ...DEFAULT_WEIGHTS, accelBrakeSwitch: 0.4 };
    const weightsABS03 = { ...DEFAULT_WEIGHTS, accelBrakeSwitch: 0.3 };

    // Get all Петрич drivers
    const data = await engine.getDriverPerformance(START, END, { 
        weights: weightsDefault,
        countryNames: ['Петрич']
    });

    console.log(`\n${'Driver'.padEnd(40)} ${'Frotcom'.padStart(8)} ${'Default'.padStart(8)} ${'ABS=0.3'.padStart(8)} ${'ABS=0.4'.padStart(8)} ${'km'.padStart(8)} ${'Δ def'.padStart(7)} ${'Δ 0.4'.padStart(7)}`);
    console.log('-'.repeat(105));

    let totalDiffDefault = 0, totalDiffABS04 = 0, matchDefault = 0, matchABS04 = 0;
    let matchedDrivers = 0;

    for (const d of data.sort((a,b) => b.score - a.score)) {
        const frotcom = fuzzyMatch(d.driverName);
        if (frotcom === null) continue;
        matchedDrivers++;

        const scoreABS04 = calcScore(d.events, d.distance, d.idling, d.rpm, weightsABS04);
        const scoreABS03 = calcScore(d.events, d.distance, d.idling, d.rpm, weightsABS03);

        const diffDefault = d.score - frotcom;
        const diffABS04 = scoreABS04 - frotcom;

        totalDiffDefault += Math.abs(diffDefault);
        totalDiffABS04 += Math.abs(diffABS04);
        if (Math.abs(diffDefault) <= 0.1) matchDefault++;
        if (Math.abs(diffABS04) <= 0.1) matchABS04++;

        const name = d.driverName.replace(' - Петрич', '').slice(0, 38);
        const d0 = diffDefault >= 0 ? `+${diffDefault.toFixed(2)}` : diffDefault.toFixed(2);
        const d4 = diffABS04 >= 0 ? `+${diffABS04.toFixed(2)}` : diffABS04.toFixed(2);
        const marker = Math.abs(diffABS04) < Math.abs(diffDefault) ? ' ↓' : (Math.abs(diffABS04) > Math.abs(diffDefault) ? ' ↑' : '');

        console.log(
            name.padEnd(40),
            frotcom.toFixed(1).padStart(8),
            d.score.toFixed(2).padStart(8),
            scoreABS03.toFixed(2).padStart(8),
            scoreABS04.toFixed(2).padStart(8),
            d.distance.toFixed(0).padStart(8),
            d0.padStart(7),
            (d4 + marker).padStart(7)
        );
    }

    console.log('\n' + '='.repeat(105));
    console.log(`Matched: ${matchedDrivers} drivers`);
    console.log(`Avg |diff| with DEFAULT:   ${(totalDiffDefault/matchedDrivers).toFixed(3)}`);
    console.log(`Avg |diff| with ABS=0.4:   ${(totalDiffABS04/matchedDrivers).toFixed(3)}`);
    console.log(`Exact matches (±0.1) DEFAULT: ${matchDefault}/${matchedDrivers}`);
    console.log(`Exact matches (±0.1) ABS=0.4: ${matchABS04}/${matchedDrivers}`);

    await pool.end();
}

main().catch(console.error);
