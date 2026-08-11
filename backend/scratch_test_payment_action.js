const fs = require('fs');
const lines = fs.readFileSync('/root/IMA-Campus/backend/controllers/paymentController.js', 'utf8').split('\n');
console.log(lines.slice(410, 480).join('\n'));
