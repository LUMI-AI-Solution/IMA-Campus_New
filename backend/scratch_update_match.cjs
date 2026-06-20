const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Update the prompt to be more specific
const oldPrompt = `You are an expert AI bank slip reader for the bank "\\${activeSettings.activeBank}".
Analyze the slip.
Extract:
- transaction_id: (The unique bank transaction reference number, ID, or reference code. Return null if unreadable)
- amount: (The transfer amount as a decimal number, e.g. 5000.00, without commas)
- date: (The exact transaction date from the slip, converted to YYYY-MM-DD format. Return null if unreadable. NEVER guess the date)`;

const newPrompt = `You are an expert AI bank slip reader for the bank "\\${activeSettings.activeBank}".
Analyze the slip carefully.
Extract:
- transaction_id: (The unique bank transaction reference number. Look for 'DEPOSITOR RELATED REFERENCE', 'REF', or any 9 to 12 digit number. Do NOT extract short 'RECORD NO'. Return null if unreadable)
- amount: (The transfer amount as a decimal number, e.g. 5000.00, without commas)
- date: (The exact transaction date from the slip, converted to YYYY-MM-DD format. Return null if unreadable. NEVER guess the date)`;

content = content.replace(oldPrompt, newPrompt);

// 2. Update the matching logic
const oldMatchLogic = `                     if (Math.abs(rowAmount - targetAmount) <= 0.1) {
                         if (cleanTxnId && cleanTxnId.length >= 3 && rowRef.includes(cleanTxnId)) {
                             matchedRowIndex = i + 1; // 1-based index
                             matchMethod = 'Exact Ref ID & Amount Match in GSheet';
                             confidence = 0.98;
                             break;
                         }
                     }`;

const newMatchLogic = `                     if (Math.abs(rowAmount - targetAmount) <= 0.1) {
                         // Remove all spaces, dashes, etc for a clean comparison
                         const normRowRef = rowRef.replace(/[^a-zA-Z0-9]/g, '');
                         const normTxnId = cleanTxnId.replace(/[^a-zA-Z0-9]/g, '');
                         
                         if (normTxnId && normTxnId.length >= 3 && normRowRef.includes(normTxnId)) {
                             matchedRowIndex = i + 1; // 1-based index
                             matchMethod = 'Exact Ref ID & Amount Match in GSheet';
                             confidence = 0.98;
                             break;
                         } else if (normTxnId && normTxnId.length >= 8) {
                             // Fallback: If AI extracted something long, check if a 6+ digit chunk matches
                             // E.g. AI got "0762765116" but rowRef is "CRDLESDEP 00762765116" (maybe AI included a digit the bank omitted)
                             const coreId = normTxnId.substring(normTxnId.length - 8); // last 8 digits
                             if (normRowRef.includes(coreId)) {
                                 matchedRowIndex = i + 1;
                                 matchMethod = 'Partial Ref ID (last 8) & Amount Match';
                                 confidence = 0.90;
                                 break;
                             }
                         }
                     }`;

content = content.replace(oldMatchLogic, newMatchLogic);

// 3. Update the skip reason to log what AI extracted
const oldSkipReason = `const skipReason = \`AI Skipped: \${matchMethod || 'No matching bank transaction found'}\`;`;
const newSkipReason = `const skipReason = \`AI Skipped: \${matchMethod || 'No match found'}. (Extracted ID: \${extracted.transaction_id}, Amount: \${extracted.amount})\`;`;

content = content.replace(oldSkipReason, newSkipReason);

fs.writeFileSync(filePath, content);
console.log("Replaced logic.");
