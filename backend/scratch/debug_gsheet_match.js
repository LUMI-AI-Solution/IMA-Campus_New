const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { google } = require('googleapis');

async function debugMatch() {
    console.log("Fetching GSHEET_CONFIGS...");
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    const configs = JSON.parse(configSetting.value);
    console.log("Configs:", configs);

    // Get all spreadsheet IDs
    let spreadsheetIds = [];
    for (const folderName in configs) {
        for (const month in configs[folderName]) {
            spreadsheetIds.push(...configs[folderName][month]);
        }
    }
    console.log("Spreadsheet IDs:", spreadsheetIds);

    const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
    const sheets = google.sheets({ version: 'v4', auth: apiKey });

    for (const spreadsheetId of spreadsheetIds) {
        try {
            const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
            const sheetTitles = sheetMetadata.data.sheets.map(s => s.properties.title);
            
            const ranges = sheetTitles.map(t => `'${t}'!A:Z`);
            const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
            
            for (let idx = 0; idx < response.data.valueRanges.length; idx++) {
                const values = response.data.valueRanges[idx].values;
                if (!values || values.length === 0) continue;

                let headers = values[0].map(h => String(h).trim().toLowerCase());
                let dataStartIndex = 1;
                if (!headers.includes('date') && !headers.includes('amount')) {
                    headers = ['date', 'description', 'amount'];
                    dataStartIndex = 0;
                }

                console.log("Headers:", headers);

                for (let i = dataStartIndex; i < values.length; i++) {
                    const rowArr = values[i];
                    let row = {};
                    headers.forEach((h, hIdx) => {
                        row[h] = rowArr[hIdx] || '';
                    });

                    let amtVal = String(row['Amount'] || row['amount'] || row['Cr'] || row['Credit'] || row['credit'] || '');
                    let rowAmount = parseFloat(amtVal.replace(/,/g, ''));
                    let refVal = String(row['Ref'] || row['ref'] || row['Description'] || row['description'] || row['desc'] || '').trim();

                    if (rowAmount === 2200) {
                        console.log(`\nFound row with 2200! Row index: ${i}`);
                        console.log(`Original Ref: ${refVal}`);
                        
                        const normRowRef = refVal.replace(/[^a-zA-Z0-9]/g, '');
                        const cleanTxnId = "ANAMADUW-CRM1 BR";
                        const normTxnId = cleanTxnId.replace(/[^a-zA-Z0-9]/g, '');
                        
                        console.log(`normRowRef: ${normRowRef}`);
                        console.log(`normTxnId: ${normTxnId}`);
                        console.log(`Includes?: ${normRowRef.includes(normTxnId)}`);
                    }
                }
            }
        } catch (e) {
            console.error(e.message);
        }
    }
}
debugMatch();
