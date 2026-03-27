
interface DriverStat {
    name: string;
    accLow: number;
    accHigh: number;
    brkLow: number;
    brkHigh: number;
    corn: number;
    idelMins: number;
    score: number;
}

const data: DriverStat[] = [
    { name: 'Goran Spasovski', accLow: 0.10, accHigh: 0.10, brkLow: 0.50, brkHigh: 0.10, corn: 0.54, idelMins: 61, score: 8.4 },
    { name: 'Marjan Trajkovski', accLow: 0.20, accHigh: 0.13, brkLow: 0.20, brkHigh: 0.54, corn: 0.18, idelMins: 17, score: 7.9 },
    { name: 'Marjan Stefanovski', accLow: 0.38, accHigh: 0.56, brkLow: 0.20, brkHigh: 0.27, corn: 0.26, idelMins: 37, score: 7.6 },
    { name: 'Boban Andreevski', accLow: 0.16, accHigh: 0.16, brkLow: 0.39, brkHigh: 0.70, corn: 0.14, idelMins: 25, score: 7.5 },
    { name: 'Goran Dimishkovska', accLow: 0.21, accHigh: 0.29, brkLow: 1.20, brkHigh: 1.77, corn: 0.59, idelMins: 0.7, score: 6.9 },
    { name: 'Zlate Vujovski', accLow: 0.82, accHigh: 0.88, brkLow: 0.55, brkHigh: 0.49, corn: 0.42, idelMins: 8, score: 6.5 },
];

const weights = {
    accLow: 0.90,
    accHigh: 0.75,
    brkLow: 0.65,
    brkHigh: 0.75,
    corn: 0.70,
    idling: 0.20
};

// We want to minimize Sum (Score_predicted - Score_actual)^2
function calculateScore(d: DriverStat, K: number) {
    let penalty = 0;

    // Test hypothesis: Penalty = EventRate * Weight * Multiplier
    penalty += d.accLow * weights.accLow * K;
    penalty += d.accHigh * weights.accHigh * K;
    penalty += d.brkLow * weights.brkLow * K;
    penalty += d.brkHigh * weights.brkHigh * K;
    penalty += d.corn * weights.corn * K;
    penalty += d.idelMins * weights.idling * (K / 10); // Idling might have a different scale

    return 10 - penalty;
}

let bestK = 0;
let bestError = Infinity;

for (let k = 0.1; k <= 5.0; k += 0.01) {
    let error = 0;
    for (const d of data) {
        const p = calculateScore(d, k);
        error += Math.pow(p - d.score, 2);
    }
    if (error < bestError) {
        bestError = error;
        bestK = k;
    }
}

console.log(`Best single K factor: ${bestK.toFixed(2)}`);
console.log(`Error: ${bestError.toFixed(4)}`);

for (const d of data) {
    const p = calculateScore(d, bestK);
    console.log(`${d.name}: Pred = ${p.toFixed(2)} | Act = ${d.score.toFixed(2)}`);
}

