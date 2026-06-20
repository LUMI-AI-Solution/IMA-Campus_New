const { google } = require('googleapis');

async function testSheet() {
    const sheets = google.sheets({ version: 'v4', auth: 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw' });
    
    // We need a test sheet ID. 
    // Since I don't have one, I will just print how the api is instantiated.
    console.log("Google Sheets API initialized with API Key.");
}

testSheet().catch(console.error);
