const fs = require('fs');
const code = fs.readFileSync('/root/IMA-Campus/backend/controllers/afterSeminarInquiryController.js', 'utf8');
const lines = code.split('\n');
let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('exports.getLeads =')) {
        start = i;
    }
    // simple heuristic to find end of function
    if (start !== -1 && i > start && lines[i].startsWith('};')) {
        end = i;
        break;
    }
}
console.log(lines.slice(start, end+1).join('\n'));
