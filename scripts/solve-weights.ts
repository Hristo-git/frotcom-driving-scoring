
const drivers = [
    {
        name: "Nikolai",
        targets: [4.3],
        records: [
            { scores: [4, 1, 6, 2, 8, 10, 1], target: 4.3 } // Row 78: AccL, AccH, BrkL, BrkH, Corn, Idle, RPM
        ]
    },
    {
        name: "Kostadin",
        targets: [7.7],
        records: [
            { scores: [9, 5, 10, 6, 9, 8, 1, 10], target: 7.7 } // Row 75: + Cruise (10)
        ]
    },
    {
        name: "Martin",
        targets: [5.4],
        records: [
            { scores: [7, 3, 8, 1, 9, 10, 4], target: 5.4 } // Row 782
        ]
    }
];

function solve() {
    console.log("Searching for weights...");
    let bestDelta = 999;
    let bestWeights = null;

    // We assume Safety weights are equal (standard Frotcom)
    // We assume Efficiency weights might be different
    for (let sw = 0.5; sw <= 2.0; sw += 0.1) {
        for (let iw = 0.1; iw <= 1.0; iw += 0.05) {
            for (let rw = 0.1; rw <= 1.0; rw += 0.05) {
                for (let cw = 0.0; cw <= 0.5; cw += 0.05) {
                    let totalDelta = 0;
                    
                    drivers.forEach(d => {
                        d.records.forEach(r => {
                            // r.scores = [AccL, AccH, BrkL, BrkH, Corn, Idle, RPM, Cruise?]
                            const weights = [sw, sw, sw, sw, sw, iw, rw, cw];
                            let weightedSum = 0;
                            let weightSum = 0;
                            
                            for(let i=0; i<r.scores.length; i++) {
                                weightedSum += r.scores[i] * weights[i];
                                weightSum += weights[i];
                            }
                            
                            const calc = weightedSum / weightSum;
                            totalDelta += Math.abs(calc - r.target);
                        });
                    });

                    if (totalDelta < bestDelta) {
                        bestDelta = totalDelta;
                        bestWeights = { sw, iw, rw, cw };
                    }
                }
            }
        }
    }

    console.log("Best Delta:", bestDelta);
    console.log("Best Weights:", bestWeights);
}

solve();
