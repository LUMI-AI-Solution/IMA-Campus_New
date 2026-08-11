const { google } = require('googleapis');
const path = require('path');

async function test() {
    const spreadsheetId = '1S5t21smvLm2wcV5QnJ1fDfTD4my2ceYVpa-iTBwm3bE';
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'gsheet-service-account.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
        let sheetTitles = sheetMetadata.data.sheets.map(s => s.properties.title);
        
        const ranges = sheetTitles.map(t => `'${t}'!A:Z`);
        const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
        
        if (response.data.valueRanges) {
            response.data.valueRanges.forEach((vr, i) => {
                if (vr.values) {
                    vr.values.forEach((row, rowIndex) => {
                        const rowStr = row.join(' | ');
                        if (rowStr.includes('0740503229') || rowStr.includes('10500')) {
                            console.log(`Found in sheet '${sheetTitles[i]}' row ${rowIndex + 1}: ${rowStr}`);
                        }
                    });
                }
            });
        }
    } catch(e) {
        console.error("ERROR:", e.message);
    }
}
test();
