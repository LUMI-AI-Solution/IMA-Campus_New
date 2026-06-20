const { google } = require('googleapis');
const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
const sheets = google.sheets({ version: 'v4', auth: apiKey });

async function run() {
    try {
        const spreadsheetId = '1H8G0QcXS5OYgQwqFwM1L9K_OTr3fQSpGm63ICOqKs70';
        console.log("Fetching spreadsheetId:", spreadsheetId);
        const res = await sheets.spreadsheets.get({ spreadsheetId });
        console.log("Success! Sheets:", res.data.sheets.map(s => s.properties.title));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
