const { google } = require('googleapis');
const fs = require('fs');

async function dumpSheet() {
    const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
    const sheets = google.sheets({ version: 'v4', auth: apiKey });
    try {
        const response = await sheets.spreadsheets.values.get({ 
            spreadsheetId: '1H8G0QcXS5OYgQwqFwM1L9K_OTr3fQSpGm63ICOqKs70', 
            range: 'A1:C50' 
        });
        fs.writeFileSync('/root/IMA-Campus/backend/scratch/sheet_dump.json', JSON.stringify(response.data.values, null, 2));
        console.log("Dumped to /root/IMA-Campus/backend/scratch/sheet_dump.json");
    } catch(e) {
        console.error(e.message);
    }
}
dumpSheet();
