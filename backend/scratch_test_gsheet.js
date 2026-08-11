const { google } = require('googleapis');
const path = require('path');

async function test() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'gsheet-service-account.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '1S5t21smvLm2wcV5QnJ1fDfTD4my2ceYVpa-iTBwm3bE';
        const res = await sheets.spreadsheets.get({ spreadsheetId });
        console.log("SUCCESS! Sheet title:", res.data.properties.title);
    } catch(e) {
        console.error("ERROR:", e.message);
    }
}
test();
