const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', 'utf8');

// Use global replacement for { campaignType: 'AFTER_SEMINAR' } where it's missing inquiryType
// but let's be careful. Let's just manually replace the specific lines that matter.
const regex = /buildStatsWhereClause\((.*?)\{([^}]*?)campaignType:\s*'AFTER_SEMINAR'([^}]*?)\}/g;
code = code.replace(regex, (match, args, before, after) => {
    if (match.includes("inquiryType")) return match; // Already fixed
    return `buildStatsWhereClause(${args}{${before}campaignType: 'AFTER_SEMINAR', inquiryType: 'PAID_CAMP'${after}}`;
});

// For updateMany and other queries:
code = code.replace(/where:\s*\{\s*campaignType:\s*'AFTER_SEMINAR',\s*paymentIntention:\s*\{\s*not:\s*'NOT_DECIDED'\s*\}\s*\}/g, "where: { campaignType: 'AFTER_SEMINAR', inquiryType: 'PAID_CAMP', paymentIntention: { not: 'NOT_DECIDED' } }");

fs.writeFileSync('/root/IMA-Campus/backend/controllers/afterSeminarRetentionController.js', code);
console.log("Updated afterSeminarRetentionController.js completely");
