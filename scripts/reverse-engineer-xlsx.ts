/**
 * Reverse-engineer Frotcom scoring from xlsx ground-truth data.
 *
 * READS:  temp/01.03-27.03 události.xlsx  (official Frotcom export)
 * EXTRACTS per driver: events per category, km, idle%, rpm%, Frotcom score
 * COMPUTES category scores using our existing thresholds
 * OPTIMISES weights to minimise |ours − target|
 */
import * as XLSX from 'xlsx';
import * as path from 'path';

// ── Scoring scales (copied from lib/scoring-scales.ts) ─────────────────────
const SCALES: Record<string, number[]> = {
    harshAccelerationLow:  [0.08, 0.35, 0.80, 1.30, 2.00, 2.85, 3.85, 5.50, 9.00],
    harshAccelerationHigh: [0.03, 0.08, 0.20, 0.28, 0.45, 0.65, 1.15, 1.60, 2.65],
    harshBrakingLow:       [0.30, 0.80, 1.35, 1.75, 2.30, 3.00, 3.90, 4.90, 7.50],
    harshBrakingHigh:      [0.05, 0.10, 0.19, 0.30, 0.42, 0.56, 0.83, 1.21, 1.90],
    harshCornering:        [0.25, 1.20, 3.85, 7.70, 13.70, 19.70, 23.50, 35.20, 45.00],
};

function stepScore(value: number, scale: number[]): number {
    if (value <= scale[0]) return 10.0;
    if (value > scale[scale.length - 1]) return 1.0;
    for (let i = 0; i < scale.length - 1; i++) {
        if (value >= scale[i] && value <= scale[i + 1]) {
            const upper = 10 - i;
            const lower = 10 - (i + 1);
            const ratio = (value - scale[i]) / (scale[i + 1] - scale[i]);
            return upper - ratio * (upper - lower);
        }
    }
    return 1.0;
}

function linearScore(value: number, min: number, max: number): number {
    if (value <= min) return 10.0;
    if (value >= max) return 1.0;
    return 10.0 - ((value - min) / (max - min)) * 9.0;
}

// ── Parse xlsx ──────────────────────────────────────────────────────────────
interface DriverRecord {
    name:       string;
    score:      number;   // Frotcom target score
    km:         number;
    idlePerc:   number;
    rpmPerc:    number;
    rpmAvail:   boolean;  // false when sensor not available
    accelLow:   number;   // raw event counts (whole period)
    accelHigh:  number;
    brakeLow:   number;
    brakeHigh:  number;
    cornering:  number;
    accelBrakeSwitch: number;
}

function parseXlsx(filePath: string): DriverRecord[] {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const drivers: DriverRecord[] = [];

    // Structure per driver block:
    //   Row A:  "Шофьор | Тип | Автомобили | Точков резулта | Километри | ... | Под макс. обор | Натискания на | % от общо изра | Работа на пряк" (col headers)
    //   Row A+1: "*DriverName | *DriverName | Plates | Score | Km | ... | RPM_STATUS | ? | ? | idle%"  (driver data)
    //   Row A+2: empty
    //   Row A+3: "Автомобил | Брой бързи уск | Брой бързи уск | ... | Километри" (vehicle col headers)
    //   Row A+4..: vehicle rows (plate, accelLow, accelHigh, brakeLow, brakeHigh, cornering, accelBrakeSwitch, idleFrac, rpmFrac, alarms, noCruise, cruiseAccel, km, drivingTime)
    //   ... empty rows ...

    // Detect driver rows: col[0] starts with "*" AND col[3] is numeric (score) AND col[4] is numeric (km)
    // Detect vehicle rows: preceded by "Автомобил" header row, col[12] = km (numeric > 0)

    console.log('\n=== First 30 rows diagnostic ===');
    rows.slice(0, 30).forEach((r, i) => {
        const preview = r.slice(0, 14).map((v: any) => String(v).substring(0, 14).padEnd(15)).join('|');
        console.log(`${String(i).padStart(3)}: ${preview}`);
    });

    let i = 0;
    while (i < rows.length) {
        const row = rows[i];
        const col0 = String(row[0] ?? '').trim();

        // Look for driver header row ("Шофьор")
        if (col0.startsWith('Шофьор')) {
            // Next row should be the driver data row
            const dRow = rows[i + 1];
            if (!dRow) { i++; continue; }

            const dName = String(dRow[0] ?? '').trim().replace(/^\*/, '');
            const scoreStr = String(dRow[3] ?? '').trim();
            const kmStr    = String(dRow[4] ?? '').trim();
            const rpmStat  = String(dRow[10] ?? '').trim();
            const idleStr  = String(dRow[13] ?? '').trim();

            const score = parseFloat(scoreStr);
            const km    = parseFloat(kmStr);
            const idle  = parseFloat(idleStr);

            if (!dName || isNaN(score) || isNaN(km)) { i++; continue; }

            // RPM availability: "Не е достъпен" = not available
            const rpmAvail = !rpmStat.includes('достъп');
            const rpmPerc  = rpmAvail ? parseFloat(rpmStat) : 0;

            // Skip to vehicle section: find "Автомобил" header
            let j = i + 2;
            while (j < rows.length && !String(rows[j]?.[0] ?? '').trim().startsWith('Автомобил')) {
                j++;
            }
            j++; // skip "Автомобил" header row

            // Collect vehicle rows
            let accelLow = 0, accelHigh = 0, brakeLow = 0, brakeHigh = 0;
            let cornering = 0, accelBrakeSwitch = 0;

            while (j < rows.length) {
                const vrow = rows[j];
                const vPlate = String(vrow[0] ?? '').trim();
                const vKm    = parseFloat(String(vrow[12] ?? ''));

                // Stop if empty row or next section
                if (!vPlate || isNaN(vKm) || vKm <= 0) break;
                // Stop if this looks like a "Шофьор" or "Автомобил" header
                if (vPlate.startsWith('Шофьор') || vPlate.startsWith('Автомобил')) break;

                accelLow         += parseFloat(String(vrow[1] ?? '0')) || 0;
                accelHigh        += parseFloat(String(vrow[2] ?? '0')) || 0;
                brakeLow         += parseFloat(String(vrow[3] ?? '0')) || 0;
                brakeHigh        += parseFloat(String(vrow[4] ?? '0')) || 0;
                cornering        += parseFloat(String(vrow[5] ?? '0')) || 0;
                accelBrakeSwitch += parseFloat(String(vrow[6] ?? '0')) || 0;
                j++;
            }

            drivers.push({
                name:  dName,
                score: score,
                km:    km,
                idlePerc: isNaN(idle) ? 0 : idle,
                rpmPerc:  isNaN(rpmPerc) ? 0 : rpmPerc,
                rpmAvail,
                accelLow, accelHigh, brakeLow, brakeHigh, cornering, accelBrakeSwitch,
            });
            i = j;
        } else {
            i++;
        }
    }
    return drivers;
}

// ── Compute category scores for a driver ───────────────────────────────────
interface CatScores {
    accelLow:  number;
    accelHigh: number;
    brakeLow:  number;
    brakeHigh: number;
    corner:    number;
    idle:      number;
    rpm:       number;
}

function catScoresFor(d: DriverRecord): CatScores {
    if (d.km <= 0) return { accelLow: 10, accelHigh: 10, brakeLow: 10, brakeHigh: 10, corner: 10, idle: 10, rpm: 10 };
    const r = d.km / 100;
    return {
        accelLow:  stepScore(d.accelLow  / r, SCALES.harshAccelerationLow),
        accelHigh: stepScore(d.accelHigh / r, SCALES.harshAccelerationHigh),
        brakeLow:  stepScore(d.brakeLow  / r, SCALES.harshBrakingLow),
        brakeHigh: stepScore(d.brakeHigh / r, SCALES.harshBrakingHigh),
        corner:    stepScore(d.cornering / r, SCALES.harshCornering),
        idle:      linearScore(d.idlePerc, 0, 50),
        rpm:       d.rpmAvail ? linearScore(d.rpmPerc, 0, 35) : 10.0,
    };
}

function computeScore(cs: CatScores, w: number[], rpmAvail: boolean): number {
    // w = [accelLow, accelHigh, brakeLow, brakeHigh, corner, idle, rpm]
    const items = [
        { s: cs.accelLow,  wt: w[0] },
        { s: cs.accelHigh, wt: w[1] },
        { s: cs.brakeLow,  wt: w[2] },
        { s: cs.brakeHigh, wt: w[3] },
        { s: cs.corner,    wt: w[4] },
        { s: cs.idle,      wt: w[5] },
        { s: cs.rpm,       wt: rpmAvail ? w[6] : 0 },
    ];
    let ws = 0, wt = 0;
    items.forEach(i => { if (i.wt > 0) { ws += i.s * i.wt; wt += i.wt; } });
    if (wt === 0) return 10.0;
    return Math.min(10, Math.max(1, ws / wt));
}

// ── Grid search to find best weights ───────────────────────────────────────
function gridSearch(drivers: DriverRecord[], catScoresMap: CatScores[]): void {
    console.log('\n=== Grid Search for Best Weights ===');
    console.log('Fixing known-good weights from Frotcom UI screenshots:');
    console.log('  accelLow=0.90, accelHigh=0.75, brakeLow=0.65, brakeHigh=0.75, corner=0.70');
    console.log('  idle ∈ [0.10..0.35]  rpm ∈ [0.10..0.40]\n');

    // Safety weights confirmed from Frotcom UI
    const safetyW = [0.90, 0.75, 0.65, 0.75, 0.70];

    let best = { err: Infinity, idle: 0, rpm: 0 };

    for (let idle = 0.10; idle <= 0.35; idle += 0.005) {
        for (let rpm = 0.00; rpm <= 0.40; rpm += 0.005) {
            const w = [...safetyW, idle, rpm];
            let sumErr = 0;
            drivers.forEach((d, idx) => {
                if (d.km < 50) return;
                const got = computeScore(catScoresMap[idx], w, d.rpmAvail);
                sumErr += Math.abs(got - d.score);
            });
            const avg = sumErr / drivers.filter(d => d.km >= 50).length;
            if (avg < best.err) {
                best = { err: avg, idle: parseFloat(idle.toFixed(3)), rpm: parseFloat(rpm.toFixed(3)) };
            }
        }
    }

    console.log(`Best idle weight: ${best.idle.toFixed(3)}  rpm weight: ${best.rpm.toFixed(3)}  avg|diff|: ${best.err.toFixed(4)}`);

    // Show per-driver comparison with best weights
    const bestW = [...safetyW, best.idle, best.rpm];
    console.log('\n=== Per-driver comparison with best weights ===');
    console.log('Driver'.padEnd(43) + 'km'.padStart(7) + 'Target'.padStart(8) + 'Ours'.padStart(8) + 'Diff'.padStart(7) + '  CatScores(AL/AH/BL/BH/CO/ID/RP)');
    console.log('─'.repeat(120));

    let sumErr2 = 0, n = 0;
    const rows: any[] = [];
    drivers.forEach((d, idx) => {
        if (d.km < 50) return;
        const cs = catScoresMap[idx];
        const got = computeScore(cs, bestW, d.rpmAvail);
        rows.push({ d, cs, got, diff: got - d.score });
    });
    rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    rows.forEach(r => {
        sumErr2 += Math.abs(r.diff); n++;
        const flag = Math.abs(r.diff) < 0.10 ? ' ✓' : Math.abs(r.diff) < 0.30 ? ' ~' : '  ';
        const cs = r.cs as CatScores;
        const catStr = [cs.accelLow, cs.accelHigh, cs.brakeLow, cs.brakeHigh, cs.corner, cs.idle, cs.rpm]
            .map(v => v.toFixed(1)).join('/');
        console.log(
            r.d.name.substring(0, 42).padEnd(43) +
            r.d.km.toFixed(1).padStart(7) +
            r.d.score.toFixed(3).padStart(8) +
            r.got.toFixed(3).padStart(8) +
            r.diff.toFixed(3).padStart(7) +
            flag + '  ' + catStr
        );
    });
    console.log('─'.repeat(120));
    console.log(`Avg |diff|: ${(sumErr2 / n).toFixed(4)}   n=${n}`);
}

// ── Also try free optimization of all 7 weights ────────────────────────────
function fullGridSearch(drivers: DriverRecord[], catScoresMap: CatScores[]): void {
    console.log('\n=== Full 7-weight optimization ===');
    // Too large to do full grid, so we do a coarser search around known values
    const eligible = drivers.filter(d => d.km >= 50);
    if (eligible.length === 0) { console.log('No drivers with km>=50'); return; }

    const safetyOptions = [
        [0.90, 0.75, 0.65, 0.75, 0.70],  // from UI screenshot
        [1.00, 1.00, 1.00, 1.00, 1.00],  // equal
        [0.80, 0.60, 0.60, 0.60, 0.60],  // lower
    ];

    let best = { err: Infinity, w: [] as number[] };

    safetyOptions.forEach(safety => {
        for (let idle = 0.10; idle <= 0.35; idle += 0.01) {
            for (let rpm = 0.00; rpm <= 0.40; rpm += 0.01) {
                const w = [...safety, idle, rpm];
                let sumErr = 0;
                eligible.forEach((d, _) => {
                    const idx = drivers.indexOf(d);
                    const got = computeScore(catScoresMap[idx], w, d.rpmAvail);
                    sumErr += Math.abs(got - d.score);
                });
                const avg = sumErr / eligible.length;
                if (avg < best.err) {
                    best = { err: avg, w: [...w] };
                }
            }
        }
    });

    console.log(`Best weights: [${best.w.map(v => v.toFixed(2)).join(', ')}]`);
    console.log(`Avg |diff|: ${best.err.toFixed(4)}`);
    console.log(`accelLow=${best.w[0]} accelHigh=${best.w[1]} brakeLow=${best.w[2]} brakeHigh=${best.w[3]} corner=${best.w[4]} idle=${best.w[5]} rpm=${best.w[6]}`);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
    const xlsxPath = path.resolve('temp/01.03-27.03 събития.xlsx');
    console.log(`Reading: ${xlsxPath}`);

    const drivers = parseXlsx(xlsxPath);
    console.log(`\nParsed ${drivers.length} drivers`);

    if (drivers.length === 0) {
        console.log('No drivers parsed — check column indices above in diagnostic');
        return;
    }

    // Print all parsed driver data
    console.log('\n=== Parsed Drivers ===');
    console.log('Driver'.padEnd(43) + 'km'.padStart(7) + 'Score'.padStart(7) + 'idle%'.padStart(7) + 'rpm%'.padStart(6) + '  AL  AH  BL  BH  CO  ABS');
    console.log('─'.repeat(100));
    drivers.forEach(d => {
        console.log(
            d.name.substring(0, 42).padEnd(43) +
            d.km.toFixed(1).padStart(7) +
            d.score.toFixed(3).padStart(7) +
            d.idlePerc.toFixed(1).padStart(7) +
            (d.rpmAvail ? d.rpmPerc.toFixed(1) : 'N/A').padStart(6) +
            `  ${String(d.accelLow).padStart(3)} ${String(d.accelHigh).padStart(3)} ${String(d.brakeLow).padStart(3)} ${String(d.brakeHigh).padStart(3)} ${String(d.cornering).padStart(3)} ${String(d.accelBrakeSwitch).padStart(3)}`
        );
    });

    // Compute category scores for each driver
    const catScoresMap = drivers.map(d => catScoresFor(d));

    // Show what Frotcom weights give us
    const knownW = [0.90, 0.75, 0.65, 0.75, 0.70, 0.20, 0.22];
    console.log('\n=== With known Frotcom weights (0.90/0.75/0.65/0.75/0.70/0.20/0.22) ===');
    console.log('Driver'.padEnd(43) + 'km'.padStart(7) + 'Target'.padStart(8) + 'Ours'.padStart(8) + 'Diff'.padStart(7));
    console.log('─'.repeat(80));
    let sumKnown = 0, nKnown = 0;
    const knownRows: any[] = [];
    drivers.forEach((d, idx) => {
        if (d.km < 50) return;
        const got = computeScore(catScoresMap[idx], knownW, d.rpmAvail);
        knownRows.push({ d, got, diff: got - d.score });
    });
    knownRows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    knownRows.forEach(r => {
        sumKnown += Math.abs(r.diff); nKnown++;
        const flag = Math.abs(r.diff) < 0.10 ? ' ✓' : Math.abs(r.diff) < 0.30 ? ' ~' : '  ';
        console.log(
            r.d.name.substring(0, 42).padEnd(43) +
            r.d.km.toFixed(1).padStart(7) +
            r.d.score.toFixed(3).padStart(8) +
            r.got.toFixed(3).padStart(8) +
            r.diff.toFixed(3).padStart(7) + flag
        );
    });
    console.log('─'.repeat(80));
    console.log(`Avg |diff|: ${(sumKnown / nKnown).toFixed(4)}`);

    // Grid search
    gridSearch(drivers, catScoresMap);
    fullGridSearch(drivers, catScoresMap);
}

main().catch(console.error);
