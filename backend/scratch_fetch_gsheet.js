const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { google } = require('googleapis');

async function test() {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    const configs = JSON.parse(configSetting.value);
    // Find the first valid spreadsheet ID
    const spreadsheetId = configs[Object.keys(configs)[0]].spreadsheetId;
    
    const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
    const sheets = google.sheets({ version: 'v4', auth: apiKey });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'A1:K5',
    });
    console.log("Values:");
    console.log(response.data.values);
}
test().catch(console.error).finally(() => prisma.$disconnect());
