const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';

let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `                                const endColLetter = String.fromCharCode(65 + rowData.length - 1);
                                await axios.post(webAppUrl, {
                                    secret: "IMA_SECURE_TOKEN_2026",
                                    range: \`A\${matchedRowIndex}:\${endColLetter}\${matchedRowIndex}\`,
                                    values: rowData
                                });
                                console.log('Successfully wrote back to GSheet via Web App Proxy.');`;

const newCode = `                                const endColLetter = String.fromCharCode(65 + rowData.length - 1);
                                const postData = {
                                    secret: "IMA_SECURE_TOKEN_2026",
                                    range: \`A\${matchedRowIndex}:\${endColLetter}\${matchedRowIndex}\`,
                                    values: rowData
                                };
                                console.log("Sending to Web App:", postData);
                                const resApp = await axios.post(webAppUrl, postData);
                                console.log('Web App Response:', resApp.data);
                                if (resApp.data !== "Success") {
                                    console.error("Web App Error:", resApp.data);
                                } else {
                                    console.log('Successfully wrote back to GSheet via Web App Proxy.');
                                }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content);
console.log("Fixed Web App Logging.");
