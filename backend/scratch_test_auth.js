require('dotenv').config();
const { google } = require('googleapis');

async function run() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_YOUTUBE_CLIENT_ID,
        process.env.GOOGLE_YOUTUBE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_YOUTUBE_REFRESH_TOKEN });
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    try {
        // Just try to get a public sheet to test auth
        const res = await sheets.spreadsheets.get({ spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' });
        console.log("Auth works for Sheets API!");
    } catch (e) {
        console.error("Auth failed:", e.message);
    }
}
run();
