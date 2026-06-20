const { google } = require('googleapis');
const fs = require('fs');

async function run() {
    try {
        const credentials = JSON.parse(fs.readFileSync('/root/IMA-Campus/backend/serviceAccountKey.json', 'utf8'));
        const authClient = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const spreadsheetId = '1dAF-UOPhAQuIK2bFpwC1C2-RqGqWZNdPBiNaJYWw2uw'; // From May 2026 config
        
        console.log("Testing API Access...");
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A1:D1',
        });
        console.log("Success! Headers:", response.data.values[0]);
    } catch (e) {
        console.error("API Error:", e.message);
    }
}
run();
