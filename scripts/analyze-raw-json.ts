import fs from 'fs';
import path from 'path';

function analyzeRawJSON() {
    const rawDir = path.join(process.cwd(), 'scripts', 'data');
    if (!fs.existsSync(rawDir)) {
        console.log("No raw data directory found.");
        return;
    }

    const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json'));
    
    files.forEach(f => {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8'));
            console.log(`\nAnalyzing ${f}...`);
            
            // Check if there are raw objects with score
            if (Array.isArray(data)) {
                data.slice(0, 2).forEach((item, idx) => {
                     console.log(`\nItem ${idx}:`);
                     const scoreProps = Object.keys(item).filter(k => k.toLowerCase().includes('score'));
                     scoreProps.forEach(sp => console.log(`  ${sp}: ${item[sp]}`));
                     
                     if (item.ecoDrivingData) {
                         const obj = item.ecoDrivingData;
                         console.log(`  Score: ${obj.score}`);
                         console.log(`  Events: ${obj.events ? JSON.stringify(obj.events) : 'null'}`);
                         console.log(`  RPM: ${obj.highRPMPerc} | Idle: ${obj.idleTimePerc}`);
                     }
                });
            }
        } catch (e) {
            console.log(`Error reading ${f}: ${e.message}`);
        }
    });
}

analyzeRawJSON();
