const fs = require('fs');
const logs = fs.readFileSync('/root/.pm2/logs/ima-backend-out.log', 'utf8');

const blocks = logs.split('=== MATCHING RESULT ===');
for (let i = 1; i < blocks.length; i++) {
    const lines = blocks[i].split('\n').slice(0, 5);
    if (lines.some(l => l.includes('matchedRowIndex: -1'))) {
        console.log("FAILED MATCH:");
        console.log(lines.join('\n'));
    }
}
