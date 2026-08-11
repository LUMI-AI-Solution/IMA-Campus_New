const { google } = require('googleapis');
const path = require('path');

async function testAuth() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'gemini-service-account.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        // The sheet in the screenshot is "tester". Let's test a public sheet just to see if auth works.
        const res = await sheets.spreadsheets.get({ spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' });
        console.log("Auth success! We can read Google Sheets.");
    } catch (e) {
        console.error("Auth failed with gemini-service-account.json:", e.message);
    }
}
testAuth();
