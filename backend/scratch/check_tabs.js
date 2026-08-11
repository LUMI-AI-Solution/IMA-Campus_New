const fs = require('fs');
const content = fs.readFileSync('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.toLowerCase().includes('paid') || line.toLowerCase().includes('tab')) {
        console.log(`Line ${i + 1}: ${line.trim()}`);
    }
});
