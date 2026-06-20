const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';

let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `                            // Write row back
                            await sheets.spreadsheets.values.update({
                                spreadsheetId,
                                range: \`A\${matchedRowIndex}\`,
                                valueInputOption: 'USER_ENTERED',
                                requestBody: {
                                    values: [rowData]
                                }
                            });
                            console.log('Successfully wrote back to GSheet (if authorized).');`;

const newCode = `                            // Write row back using Web App if configured, else fallback
                            const webAppSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_WEB_APP_URL' } });
                            const webAppUrl = webAppSetting ? webAppSetting.value : 'https://script.google.com/macros/s/AKfycbwKgZoSnC0FhT2a02mRXdPEXqb0y2Y_v7Z4PYsILkdImH02q79YMHeYGYOLqxbc631_EQ/exec';
                            
                            if (webAppUrl) {
                                const axios = require('axios');
                                await axios.post(webAppUrl, {
                                    secret: "IMA_SECURE_TOKEN_2026",
                                    range: \`A\${matchedRowIndex}:Z\${matchedRowIndex}\`,
                                    values: rowData
                                });
                                console.log('Successfully wrote back to GSheet via Web App Proxy.');
                            } else {
                                await sheets.spreadsheets.values.update({
                                    spreadsheetId,
                                    range: \`A\${matchedRowIndex}\`,
                                    valueInputOption: 'USER_ENTERED',
                                    requestBody: {
                                        values: [rowData]
                                    }
                                });
                                console.log('Successfully wrote back to GSheet (if authorized).');
                            }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content);
console.log("Updated to use Web App URL");
