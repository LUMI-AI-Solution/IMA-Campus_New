const { google } = require('googleapis');
const path = require('path');

async function test() {
    const spreadsheetId = '1S5t21smvLm2wcV5QnJ1fDfTD4my2ceYVpa-iTBwm3bE';
    let allSheetValues = [];
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'gsheet-service-account.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
        let sheetTitles = sheetMetadata.data.sheets.map(s => s.properties.title);
        console.log("Sheet titles:", sheetTitles);
        
        const ranges = sheetTitles.map(t => `'${t}'!A:Z`);
        const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
        
        let rowCount = 0;
        if (response.data.valueRanges) {
            response.data.valueRanges.forEach((vr, i) => {
                if (vr.values && vr.values.length > 0) {
                    rowCount += vr.values.length;
                    console.log(`Sheet '${sheetTitles[i]}' has ${vr.values.length} rows.`);
                } else {
                    console.log(`Sheet '${sheetTitles[i]}' is EMPTY.`);
                }
            });
        }
        console.log("Total rows found across all sheets:", rowCount);
    } catch(e) {
        console.error("ERROR:", e.message);
    }
}
test();
