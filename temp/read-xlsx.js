const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.resolve('C:/Users/Hristo0203/Frotcom/frotcom-driver-scoring/temp/01.03-25.03.xlsx'));
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
    console.log(`\n=== Sheet: ${sheetName} ===`);
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Total rows: ${data.length}`);
    data.slice(0, 8).forEach((row, i) => console.log(`Row ${i}:`, JSON.stringify(row)));
});
