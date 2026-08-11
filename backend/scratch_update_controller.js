const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/freeSeminarController.js';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `            let parsedBatchId = settings.batchId ? parseInt(settings.batchId) : null;
            let dbPhone = \`\${phone}_BIZ_\${settings.businessId}\`;
            if (parsedBatchId) dbPhone += \`_BATCH_\${parsedBatchId}\`;`;

const replacementStr = `            let parsedBatchId = settings.batchId ? parseInt(settings.batchId) : null;
            let dbPhone = \`\${phone}_BIZ_\${settings.businessId}\`;
            if (parsedBatchId) dbPhone += \`_BATCH_\${parsedBatchId}\`;
            if (settings.campaignType === 'AFTER_SEMINAR') dbPhone += '_AS';`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(filePath, content);
console.log("Updated dbPhone generation for AFTER_SEMINAR");
