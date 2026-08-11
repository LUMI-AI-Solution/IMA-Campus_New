const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchGSheetTransactions(statementMonth) {
    try {
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (!configSetting || !configSetting.value) return { headers: [], rows: [] };

        const configs = JSON.parse(configSetting.value);
        let spreadsheetIds = [];
        
        for (const bizId in configs) {
            if (typeof configs[bizId] === 'object' && configs[bizId] !== null) {
                for (const batchId in configs[bizId]) {
                    if (typeof configs[bizId][batchId] === 'object' && configs[bizId][batchId] !== null) {
                        if (configs[bizId][batchId][statementMonth] && Array.isArray(configs[bizId][batchId][statementMonth])) {
                            spreadsheetIds.push(...configs[bizId][batchId][statementMonth]);
                        }
                    }
                }
            }
        }
        
        if (spreadsheetIds.length === 0) return { headers: [], rows: [] };

        const { google } = require('googleapis');
        const fs = require('fs');
        const serviceAccount = JSON.parse(fs.readFileSync('/root/IMA-Campus/backend/service-account.json', 'utf8'));
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: serviceAccount.client_email,
                private_key: serviceAccount.private_key,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        let allHeaders = [];
        let allRows = [];
        
        for (const spreadsheetId of spreadsheetIds) {
            try {
                const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
                const tabs = sheetMeta.data.sheets.map(s => s.properties.title);
                for (const sheetName of tabs) {
                    const response = await sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range: `${sheetName}`,
                    });
                    const values = response.data.values || [];
                    if (values.length > 0) {
                        // Guess headers
                        let headers = values[0].map(cell => {
                            let str = String(cell).trim();
                            if (!str) return 'empty';
                            if (/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(str)) return 'Date';
                            if (/^[\d,]+(\.\d{1,2})?$/.test(str)) return 'Amount';
                            return 'Description';
                        });
                        for (let i = headers.length; i < values[0].length; i++) {
                            headers.push(`Column${i + 1}`);
                        }
                        
                        const sysHeaders = ['Status', 'Actioned By', 'Business', 'Batch', 'Group', 'Subjects', 'Remark'];
                        sysHeaders.forEach(sh => {
                            if (!headers.some(h => h.toLowerCase() === sh.toLowerCase())) {
                                headers.push(sh);
                            }
                        });
                        
                        values.forEach((row, index) => {
                            let rowObj = { _rowIndex: index + 1, _spreadsheetId: spreadsheetId, _sheetName: sheetName };
                            headers.forEach((h, i) => {
                                rowObj[h] = row[i] || '';
                            });
                            allRows.push(rowObj);
                        });
                    }
                }
            } catch(e) {
                console.error(e.message);
            }
        }
        return allRows;
    } catch(e) {
        console.error(e);
        return [];
    }
}

async function test() {
    console.log("Fetching for 'July 2026'");
    const rows = await fetchGSheetTransactions('July 2026');
    console.log(`Fetched ${rows.length} rows.`);
    const matched = rows.filter(r => JSON.stringify(r).includes('7500'));
    console.log("Rows with 7500:", matched);
}
test();
