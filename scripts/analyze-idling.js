const fs = require('fs');

const content = fs.readFileSync('temp/Оценка февруари.csv', 'utf8');
const lines = content.split('\n').filter(l => l.trim().length > 0);

const data = [];
for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 26) continue;
    
    const idlingScore = parseInt(cols[14]);
    const excessiveTimeStr = cols[15];
    const rpmScore = parseInt(cols[16]);
    const underMaxRpmStr = cols[24];
    const idlingPercStr = cols[25];
    
    if (isNaN(idlingScore)) continue;

    const idlingPerc = parseFloat(idlingPercStr.replace('%', ''));
    const rpmPerc = 100 - parseFloat(underMaxRpmStr.replace('%', '')); // "above max rpm"
    
    data.push({
        idlingScore,
        excessiveTimeStr,
        idlingPerc,
        rpmScore,
        rpmPerc
    });
}

const mapIdling = {};
const mapRPM = {};

data.forEach(d => {
    if (!mapIdling[d.idlingScore]) mapIdling[d.idlingScore] = [];
    mapIdling[d.idlingScore].push(d.idlingPerc);
    
    if (!isNaN(d.rpmScore)) {
        if (!mapRPM[d.rpmScore]) mapRPM[d.rpmScore] = [];
        mapRPM[d.rpmScore].push(d.rpmPerc);
    }
});

console.log("=== IDLING % per Score ===");
Object.keys(mapIdling).sort((a,b)=>parseInt(b)-parseInt(a)).forEach(score => {
    const vals = mapIdling[score].sort((a,b)=>a-b);
    if(vals.length === 0) return;
    const min = vals[0];
    const max = vals[vals.length-1];
    const p90Idx = Math.floor(vals.length * 0.9);
    console.log(`Score ${score} -> Items: ${vals.length}, Min: ${min.toFixed(2)}%, Max: ${max.toFixed(2)}%, P90: ${vals[p90Idx].toFixed(2)}%`);
});

console.log("\n=== HIGH RPM % per Score ===");
Object.keys(mapRPM).sort((a,b)=>parseInt(b)-parseInt(a)).forEach(score => {
    const vals = mapRPM[score].sort((a,b)=>a-b);
    if(vals.length === 0) return;
    const min = vals[0];
    const max = vals[vals.length-1];
    const p90Idx = Math.floor(vals.length * 0.9);
    console.log(`Score ${score} -> Items: ${vals.length}, Min: ${min.toFixed(2)}%, Max: ${max.toFixed(2)}%, P90: ${vals[p90Idx].toFixed(2)}%`);
});
