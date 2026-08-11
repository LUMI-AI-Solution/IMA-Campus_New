const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./missing_tutes_filtered.json', 'utf8'));

let totalMissing = 0;
for (const student of data) {
    totalMissing += student.missingCount;
}

console.log(`Total missing records: ${totalMissing}`);
