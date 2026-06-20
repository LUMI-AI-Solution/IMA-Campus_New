const fs = require('fs');

let controllerCode = fs.readFileSync('backend/controllers/aiVerificationController.js', 'utf8');

// We need to replace the logic in verifySinglePayment that gets spreadsheetId
// It currently looks like:
//         const gsheetConfig = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
//         let spreadsheetId = null;
//         if (gsheetConfig && gsheetConfig.value) {
//              const configs = JSON.parse(gsheetConfig.value);
//              if (configs[statementMonth]) {
//                  spreadsheetId = configs[statementMonth].spreadsheetId;
//              }
//         }
// 
//         let gRows = [];
//         if (spreadsheetId) {

const regexVerifySingle = /const gsheetConfig = await prisma\.appSetting\.findUnique\(\{ where: \{ key: 'GSHEET_CONFIGS' \} \}\);[\s\S]*?if \(!payment\.aiVerified \|\| autoDetect\) \{/g;

controllerCode = controllerCode.replace(regexVerifySingle, `const gsheetConfig = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        let spreadsheetIds = [];
        if (gsheetConfig && gsheetConfig.value) {
             const configs = JSON.parse(gsheetConfig.value);
             for (const folderName in configs) {
                 if (configs[folderName][statementMonth] && Array.isArray(configs[folderName][statementMonth])) {
                     spreadsheetIds.push(...configs[folderName][statementMonth]);
                 }
             }
        }

        let allGRows = [];
        for (const spreadsheetId of spreadsheetIds) {
            let values = [];
            const webAppSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_WEB_APP_URL' } });
            if (webAppSetting && webAppSetting.value) {
                const axios = require('axios');
                try {
                    const response = await axios.get(\`\${webAppSetting.value}?spreadsheetId=\${spreadsheetId}\`);
                    if (response.data && response.data.values) {
                        values = response.data.values;
                    }
                } catch(e) {}
            }

            if (!values || values.length === 0) {
                const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
                const { google } = require('googleapis');
                const sheets = google.sheets({ version: 'v4', auth: apiKey });

                try {
                    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'A:Z' });
                    values = response.data.values || [];
                } catch (err) { }
            }

            if (values && values.length > 0) {
                const headers = values[0];
                const rows = values.slice(1).map((row, index) => {
                    let rowObj = { _rowIndex: index + 2, _spreadsheetId: spreadsheetId }; // Pass along spreadsheetId to write back to the correct one later
                    headers.forEach((h, i) => { rowObj[h] = row[i] || ''; });
                    return rowObj;
                });
                allGRows.push(...rows);
            }
        }
        let gRows = allGRows; // Assign back to gRows for the rest of the code

        if (!payment.aiVerified || autoDetect) {`);

fs.writeFileSync('backend/controllers/aiVerificationController.js', controllerCode);
