const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    `const sysHeaders = ['[Sys] Status', '[Sys] Actioned By', '[Sys] Business', '[Sys] Batch', '[Sys] Group', '[Sys] Subjects'];`,
    `const sysHeaders = ['Status', 'Actioned By', 'Business', 'Batch', 'Group', 'Subjects'];`
);

content = content.replace(
    `const sysHeaders = ['[Sys] Status', '[Sys] Actioned By', '[Sys] Business', '[Sys] Batch', '[Sys] Group', '[Sys] Subjects'];`,
    `const sysHeaders = ['Status', 'Actioned By', 'Business', 'Batch', 'Group', 'Subjects'];`
); // Run twice since there are two occurrences (one in verifySinglePayment, one in getBankTransactions)

fs.writeFileSync(filePath, content);
console.log("Fixed Sys Headers.");
