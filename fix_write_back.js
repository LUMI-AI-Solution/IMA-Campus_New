const fs = require('fs');

let controllerCode = fs.readFileSync('backend/controllers/aiVerificationController.js', 'utf8');

// The write back logic uses \`spreadsheetId\` from the outer scope, which is no longer there.
// Instead, it should use \`matchedRow._spreadsheetId\`.
// Let's replace \`spreadsheetId\` with \`matchedRow._spreadsheetId\` inside the write block.

const regexWriteBack = /const postData = \{\n\s*secret: "IMA_SECURE_TOKEN_2026",\n\s*spreadsheetId: spreadsheetId,\n\s*range:/g;

controllerCode = controllerCode.replace(regexWriteBack, `const postData = {
                                    secret: "IMA_SECURE_TOKEN_2026",
                                    spreadsheetId: matchedRow._spreadsheetId,
                                    range:`);

fs.writeFileSync('backend/controllers/aiVerificationController.js', controllerCode);
