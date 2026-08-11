const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../controllers/aiVerificationController.js');

let code = fs.readFileSync(file, 'utf8');

const target1 = `- transaction_id: (CRITICAL: For BOC: Look for 'DEPOSITOR RELATED REFERENCE' at the bottom of the slip and extract that exact number. Do NOT extract the TO account number. If 'DEPOSITOR RELATED REFERENCE' is not found, extract the RECORD NO. For other banks, look for REF, Reference, Seq No. IMPORTANT: The extracted ID MUST be at least 4 digits long. DO NOT extract short 2-digit numbers like "07". Return null if unreadable)`;
const replace1 = `- transaction_id: (CRITICAL: For BOC: Look for 'DEPOSITOR RELATED REFERENCE' at the bottom of the slip and extract that exact number. Do NOT extract the TO account number. If 'DEPOSITOR RELATED REFERENCE' is not found, extract the RECORD NO. For BOC Online Transfer: Look for 'Online Banking reference Number' or 'Transaction ID'. For People's Bank: Look for 'Trace No' or 'Reference'. For other banks, look for REF, Reference, Seq No. IMPORTANT: The extracted ID MUST be at least 4 digits long. DO NOT extract short 2-digit numbers like "07". Return null if unreadable)`;

const target2 = `- remark: (For Sampath Bank: Look for the 'REMARK' field. Extract exactly what is written. If it says 'NA', extract 'NA'. Return null if unreadable)`;
const replace2 = `- remark: (For Sampath Bank: Look for the 'REMARK' field. Extract exactly what is written. If it says 'NA', extract 'NA'. For People's Bank and BOC Online: Look for 'Remarks' or 'Description' and extract it. Return null if unreadable)`;

// Update autoDetect prompt
code = code.replace(target1, replace1);
code = code.replace(target2, replace2);

// Update else prompt (it has the same target lines)
code = code.replace(target1, replace1);
code = code.replace(target2, replace2);

fs.writeFileSync(file, code);
console.log("Updated AI prompt in aiVerificationController.js");
