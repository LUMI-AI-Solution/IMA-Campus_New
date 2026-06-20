const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', 'utf8');

// The payments query needs to include 0 (pending) and 2 (rejected)
code = code.replace(/status:\s*\{\s*in:\s*\[0,\s*1,\s*4\]\s*\}/g, "status: { in: [0, 1, 2, 4] }");
code = code.replace(/status:\s*\{\s*in:\s*\[1,\s*4\]\s*\}/g, "status: { in: [0, 1, 2, 4] }");

fs.writeFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', code);
console.log("Replaced payments query in afterSeminarRetentionController");
