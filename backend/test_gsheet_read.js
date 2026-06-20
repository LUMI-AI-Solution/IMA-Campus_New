const { google } = require('googleapis');
async function test() {
    const sheets = google.sheets({ version: 'v4', auth: 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw' });
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            range: 'A1:Z1'
        });
        console.log("Success:", res.data.values);
    } catch(e) {
        console.error("Error:", e.message);
    }
}
test();
