const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';

let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `                                await axios.post(webAppUrl, {
                                    secret: "IMA_SECURE_TOKEN_2026",
                                    range: \`A\${matchedRowIndex}:Z\${matchedRowIndex}\`,
                                    values: rowData
                                });`;

const newCode = `                                // Calculate ending column letter based on rowData length
                                const endColLetter = String.fromCharCode(65 + rowData.length - 1);
                                await axios.post(webAppUrl, {
                                    secret: "IMA_SECURE_TOKEN_2026",
                                    range: \`A\${matchedRowIndex}:\${endColLetter}\${matchedRowIndex}\`,
                                    values: rowData
                                });`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content);
console.log("Fixed Web App Range.");
