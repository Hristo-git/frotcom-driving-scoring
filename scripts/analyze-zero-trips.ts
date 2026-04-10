import fs from 'fs';

function test() {
    const data = fs.readFileSync('bad_drivers.txt', 'utf8');
    const sections = data.split('=== ');
    
    sections.forEach(sec => {
        if (!sec.trim()) return;
        
        const lines = sec.split('\n');
        const driverName = lines[0].replace(' ===', '').trim();
        const jsonStr = lines.slice(1).join('\n').trim();
        
        try {
            const arr = JSON.parse(jsonStr);
            let total = 0;
            let zeroDist = 0;
            let totalWeightedScore = 0;
            let filteredWeightedScore = 0;
            let filteredDist = 0;
            
            arr.forEach((x: any) => {
                const dist = parseFloat(x.dist);
                const score = parseFloat(x.f_score);
                
                total += dist;
                totalWeightedScore += (score * dist);
                
                if (score === 0 || dist < 10) {
                    zeroDist += dist;
                } else {
                    filteredWeightedScore += (score * dist);
                    filteredDist += dist;
                }
            });
            
            console.log(`\nDriver: ${driverName}`);
            console.log(`Total Distance: ${total.toFixed(2)}km`);
            console.log(`Pure Average (dist weighted): ${(totalWeightedScore / total).toFixed(2)}`);
            console.log(`Distance <= 10km OR Scored 0.0: ${zeroDist.toFixed(2)}km`);
            console.log(`Average EXCLUDING bad trips: ${filteredDist > 0 ? (filteredWeightedScore / filteredDist).toFixed(2) : 0}`);
            
        } catch (e) {
            // ignore
        }
    });
}
test();
