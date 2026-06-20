const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { google } = require('googleapis');

async function test() {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    const configs = JSON.parse(configSetting.value);
    const spreadsheetId = configs['May 2026'].spreadsheetId;
    
    const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
    const sheets = google.sheets({ version: 'v4', auth: apiKey });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'A:Z',
    });
    console.log("values[0]:", response.data.values[0]);
    console.log("values[1]:", response.data.values[1]);
}
test().catch(console.error).finally(() => prisma.$disconnect());
