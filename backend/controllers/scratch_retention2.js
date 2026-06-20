const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', 'utf8');

code = code.replace(
    /let whereClause = buildStatsWhereClause\(businessId, batchId, null, null, \{ \s*campaignType: 'AFTER_SEMINAR',\s*paymentIntention: \{ not: 'NOT_DECIDED' \}\s*\}\);/,
    `let whereClause = buildStatsWhereClause(businessId, batchId, null, null, { \n            campaignType: 'AFTER_SEMINAR',\n            inquiryType: 'PAID_CAMP',\n            paymentIntention: { not: 'NOT_DECIDED' }\n        });`
);

fs.writeFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', code);
console.log("Updated afterSeminarRetentionController.js");
