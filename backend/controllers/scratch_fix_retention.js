const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', 'utf8');

// 1. Revert inquiryType: 'PAID_CAMP'
code = code.replace(/inquiryType:\s*'PAID_CAMP',\s*/g, "");

// 2. Add status 0 to payments fetch
code = code.replace(/status:\s*\{\s*in:\s*\[1,\s*4\]\s*\}/g, "status: { in: [0, 1, 4] }");

fs.writeFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', code);
console.log("afterSeminarRetentionController.js fixed - reverted PAID_CAMP and added status 0");
