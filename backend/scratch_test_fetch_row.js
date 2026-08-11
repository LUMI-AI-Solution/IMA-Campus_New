const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

async function fetchGSheetTransactions(targetBatchId = null) {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
    if (!configSetting || !configSetting.value) return { headers: [], rows: [] };
    const configs = JSON.parse(configSetting.value);
    let spreadsheetIds = [];
    for (const bizId in configs) {
        if (typeof configs[bizId] === 'object' && configs[bizId] !== null) {
            for (const batchId in configs[bizId]) {
                if (targetBatchId && String(batchId) === String(targetBatchId)) {
                    if (Array.isArray(configs[bizId][batchId])) {
                        spreadsheetIds.push(...configs[bizId][batchId]);
                    }
                }
            }
        }
    }
    
    if (spreadsheetIds.length === 0) return { isLinked: false, headers: [], rows: [] };

    let allHeaders = [];
    let allRows = [];
    
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'gsheet-service-account.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });

    for (const idString of spreadsheetIds) {
        const parts = idString.split('|');
        const spreadsheetId = parts[0];
        try {
            const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
            let sheetTitles = sheetMetadata.data.sheets.map(s => s.properties.title);
            if (sheetTitles.length > 0) {
                const ranges = sheetTitles.map(t => `'${t}'!A:Z`);
                const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
                if (response.data.valueRanges) {
                    response.data.valueRanges.forEach((vr, i) => {
                        if (vr.values && vr.values.length > 0) {
                            let headers = vr.values[0].map(h => String(h).trim());
                            let dataRows = vr.values.slice(1);
                            let uniqueHeaders = [];
                            let headerCounts = {};
                            for (const h of headers) {
                                let base = h.trim() || 'Empty';
                                if (headerCounts[base]) { headerCounts[base]++; uniqueHeaders.push(`${base}_${headerCounts[base]}`); }
                                else { headerCounts[base] = 1; uniqueHeaders.push(base); }
                            }
                            headers = uniqueHeaders;
                            if (allHeaders.length === 0) allHeaders = headers;
                            
                            const rows = dataRows.map((row, index) => {
                                let rowObj = { _rowIndex: index + 2, _spreadsheetId: spreadsheetId, _sheetName: sheetTitles[i], isMatched: false };
                                headers.forEach((h, j) => { rowObj[h] = row[j] || ''; });
                                const keys = Object.keys(rowObj);
                                const dateKey = keys.find(k => k.toLowerCase() === 'date' || k.toLowerCase() === 'txndate');
                                rowObj.txnDate = dateKey ? rowObj[dateKey] : '';
                                const amountKey = keys.find(k => k.toLowerCase() === 'amount' || k.toLowerCase() === 'cr' || k.toLowerCase() === 'credit');
                                rowObj.amount = amountKey ? rowObj[amountKey] : '';
                                // FIXED TYPO:
                                const refKey = keys.find(k => k.toLowerCase() === 'ref' || k.toLowerCase() === 'description' || k.toLowerCase().includes('ref') || k.toLowerCase() === 'desc' || k.toLowerCase() === 'serial reference' || k.toLowerCase() === 'seriel refarance');
                                rowObj.description = refKey ? rowObj[refKey] : '';
                                return rowObj;
                            });
                            allRows.push(...rows);
                        }
                    });
                }
            }
        } catch (err) {
            console.error("Error", err.message);
        }
    }
    return { isLinked: true, headers: allHeaders, rows: allRows };
}

fetchGSheetTransactions(31).then(data => {
    const match = data.rows.filter(r => JSON.stringify(r).includes('0740503229'));
    console.log("Matching rows:", match);
}).finally(() => prisma.$disconnect());
