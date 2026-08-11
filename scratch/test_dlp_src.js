const fs = require('fs');
const src = fs.readFileSync('/tmp/zoom.py', 'utf8');
const lines = src.split('\n');
const realExtractIdx = lines.findIndex(l => l.includes('def _real_extract'));
if (realExtractIdx !== -1) {
    console.log(lines.slice(realExtractIdx, realExtractIdx + 50).join('\n'));
}
