const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', 'utf8');

code = code.replace(
    /let baseConditions = \{\s*campaignType: 'AFTER_SEMINAR',\s*paymentIntention: \{ not: 'NOT_DECIDED' \}\s*\};/,
    `let baseConditions = { \n            campaignType: 'AFTER_SEMINAR',\n            inquiryType: 'PAID_CAMP', // 🔥 FIX: Ensure ONLY Paid Campaign leads are shown\n            paymentIntention: { not: 'NOT_DECIDED' }\n        };`
);

fs.writeFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', code);
console.log("Updated afterSeminarRetentionController.js");
