const { google } = require('googleapis');

async function getSheetHeaders(spreadsheetId, apiKey) {
    try {
        const sheets = google.sheets({ version: 'v4', auth: apiKey });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A1:Z1',
        });
        console.log("Headers:", response.data.values ? response.data.values[0] : []);
    } catch (e) {
        console.error("Error reading sheet:", e.message);
    }
}
getSheetHeaders('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw');
