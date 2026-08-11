const { google } = require('googleapis');
const path = require('path');
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'gsheet-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
sheets.spreadsheets.get({ spreadsheetId: "1Qpnzoan0wtBFFf5A3oltx4JOyoGdrRNyGHU-Tfaggns" })
.then(r => console.log(r.data.sheets.map(s => s.properties.title)))
.catch(e => console.error("Error:", e.message));
