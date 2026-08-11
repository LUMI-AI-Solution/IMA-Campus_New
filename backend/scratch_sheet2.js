const { google } = require('googleapis');
const path = require('path');
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'gsheet-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = "1Qpnzoan0wtBFFf5A3oltx4JOyoGdrRNyGHU-Tfaggns";
sheets.spreadsheets.get({ spreadsheetId })
.then(async r => {
    const sheetTitles = r.data.sheets.map(s => s.properties.title);
    const ranges = sheetTitles.map(t => `'${t}'!A:Z`);
    const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
    console.log(response.data.valueRanges.map(vr => vr.values ? vr.values.length : 0));
})
.catch(e => console.error("Error:", e.message));
