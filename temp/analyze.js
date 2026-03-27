const fs = require('fs');
const readline = require('readline');

async function analyze() {
  const fileStream = fs.createReadStream('Оценка февруари.csv', 'utf8');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const categories = {
    accelLow: { scoreIdx: 3, valIdx: 4, name: 'Harsh Acceleration Low Speed' },
    accelHigh: { scoreIdx: 5, valIdx: 6, name: 'Harsh Acceleration High Speed' },
    brakingLow: { scoreIdx: 7, valIdx: 8, name: 'Harsh Braking Low Speed' },
    brakingHigh: { scoreIdx: 9, valIdx: 10, name: 'Harsh Braking High Speed' },
    cornering: { scoreIdx: 12, valIdx: 13, name: 'Harsh Cornering' },
  };

  const data = {
    accelLow: {},
    accelHigh: {},
    brakingLow: {},
    brakingHigh: {},
    cornering: {}
  };

  for (let i = 1; i <= 10; i++) {
    for (const cat in categories) {
      data[cat][i] = { min: Infinity, max: -Infinity, values: new Set() };
    }
  }

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    // Split handling quoted commas just in case, though the format looks straightforward
    // Better simple split since we only need up to index 13
    let cols = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      let c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cols.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    cols.push(cur);

    if (cols.length < 14) continue;

    for (const cat in categories) {
      const { scoreIdx, valIdx } = categories[cat];
      const scoreStr = cols[scoreIdx];
      const valStr = cols[valIdx];
      
      if (!scoreStr || !valStr || scoreStr === '-' || valStr === '-') continue;
      
      const score = parseInt(scoreStr, 10);
      const val = parseFloat(valStr);

      if (!isNaN(score) && !isNaN(val) && score >= 1 && score <= 10) {
        data[cat][score].min = Math.min(data[cat][score].min, val);
        data[cat][score].max = Math.max(data[cat][score].max, val);
        data[cat][score].values.add(val);
      }
    }
  }

  // Print results
  for (const cat in categories) {
    console.log(`\n=== ${categories[cat].name} ===`);
    console.log(`Score | Min Events/100km | Max Events/100km | Unique Values Sample`);
    console.log(`-------------------------------------------------------------`);
    for (let i = 10; i >= 1; i--) {
      const d = data[cat][i];
      if (d.min !== Infinity) {
        const sortedVals = Array.from(d.values).sort((a,b)=>a-b);
        const sample = sortedVals.length > 5 ? 
            sortedVals.slice(0, 2).join(', ') + ' ... ' + sortedVals.slice(-2).join(', ') : 
            sortedVals.join(', ');
        
        console.log(`  ${i.toString().padStart(2, ' ')}  | ${d.min.toString().padStart(14, ' ')} | ${d.max.toString().padStart(14, ' ')} | ${sample}`);
      } else {
        console.log(`  ${i.toString().padStart(2, ' ')}  |             None |             None | `);
      }
    }
  }
}

analyze();
