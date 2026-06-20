const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const match = val.match(') && lines[i].includes('a-zA-Z0-9-_')) {
        // The proper regex syntax to match /d/something
        lines[i] = "                                                                            const match = val.match(/\\/d\\/([a-zA-Z0-9-_]+)/);";
    }
}
fs.writeFileSync('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', lines.join('\n'));
console.log("Syntax fixed");
