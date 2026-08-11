const fs = require('fs');
const code = fs.readFileSync('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSeminarStaffExecution.jsx', 'utf8');
const lines = code.split('\n');
let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('fetchRegularLeads')) {
        start = i;
    }
    if (start !== -1 && i > start && lines[i].includes('} catch')) {
        end = i;
        break;
    }
}
console.log(lines.slice(Math.max(0, start-2), end+5).join('\n'));
