const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';

let content = fs.readFileSync(filePath, 'utf8');

const oldAuth = `const { google } = require('googleapis');
                    const sheets = google.sheets({ version: 'v4', auth: 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw' });`;

const newAuth = `const { google } = require('googleapis');
                    let authClient = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
                    const saSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_SERVICE_ACCOUNT' } });
                    if (saSetting && saSetting.value) {
                        try {
                            const credentials = JSON.parse(saSetting.value);
                            authClient = new google.auth.GoogleAuth({
                                credentials,
                                scopes: ['https://www.googleapis.com/auth/spreadsheets']
                            });
                        } catch (e) {
                            console.error("Invalid Service Account JSON:", e);
                        }
                    }
                    const sheets = google.sheets({ version: 'v4', auth: authClient });`;

content = content.replace(oldAuth, newAuth);
fs.writeFileSync(filePath, content);
console.log("Updated auth logic.");
