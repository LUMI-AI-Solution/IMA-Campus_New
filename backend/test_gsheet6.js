const { google } = require('googleapis');
const fs = require('fs');

async function test() {
    try {
        const spreadsheetId = '1NiXyfTRhAeT1Iv2VU4e7GCnXtbPiWcGnu1PFdE9fILw';
        const serviceAccount = JSON.parse(fs.readFileSync('/root/IMA-Campus/backend/gsheet-service-account.json', 'utf8'));
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: serviceAccount.client_email,
                private_key: serviceAccount.private_key,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
        const tabs = sheetMeta.data.sheets.map(s => s.properties.title);
        for (const sheetName of tabs) {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}`,
            });
            const values = response.data.values || [];
            if (values.length > 0) {
                const r = values.find(row => JSON.stringify(row).replace(/[^a-zA-Z0-9]/g, '').includes('0764155208'));
                if (r) {
                    console.log("Row containing txn ID:", JSON.stringify(r));
                } else {
                    console.log("No row with txn ID found in this sheet.");
                }
            }
        }
    } catch(e) { console.error(e); }
}
test();
