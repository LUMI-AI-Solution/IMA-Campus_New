const fs = require('fs');

let controllerCode = fs.readFileSync('backend/controllers/aiVerificationController.js', 'utf8');

// We need to replace the logic in getBankTransactions where it fetches spreadsheetId
// From:
//         const spreadsheetId = configs[statementMonth].spreadsheetId;
//         if (!spreadsheetId) return res.status(200).json({ headers: [], rows: [] });
// To:
// Loop over folders, find the month, get array of spreadsheetIds

const regexGetBankTxn = /exports\.getBankTransactions = async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ headers, rows \}\);\n    \} catch\(err\) \{/g;

controllerCode = controllerCode.replace(regexGetBankTxn, `exports.getBankTransactions = async (req, res) => {
    try {
        const { statementMonth } = req.query;
        if (!statementMonth) return res.status(200).json({ headers: [], rows: [] });

        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (!configSetting || !configSetting.value) return res.status(200).json({ headers: [], rows: [] });

        const configs = JSON.parse(configSetting.value);
        
        let spreadsheetIds = [];
        for (const folderName in configs) {
            if (configs[folderName][statementMonth] && Array.isArray(configs[folderName][statementMonth])) {
                spreadsheetIds.push(...configs[folderName][statementMonth]);
            }
        }

        if (spreadsheetIds.length === 0) return res.status(200).json({ headers: [], rows: [] });
        
        const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
        
        // Loop through all sheets and combine rows
        let allHeaders = [];
        let allRows = [];
        let rowOffset = 2; // Keep track of a global fake row index or just use sheet_specific index

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
                } catch(e) {
                    console.log("Web App fetch failed for", spreadsheetId, e.message);
                }
            }

            if (!values || values.length === 0) {
                const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
                const { google } = require('googleapis');
                const sheets = google.sheets({ version: 'v4', auth: apiKey });

                try {
                    const response = await sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range: 'A:Z',
                    });
                    values = response.data.values || [];
                } catch (err) {
                    console.error("Fallback GSheet fetch error:", err.message);
                    values = [];
                }
            }

            if (!values || values.length === 0) continue;

            const headers = values[0];
            if (allHeaders.length === 0) allHeaders = headers; // Use first sheet's headers

            const sysHeaders = ['Status', 'Actioned By', 'Business', 'Batch', 'Group', 'Subjects', 'Remark'];
            
            sysHeaders.forEach(sh => {
                if (!allHeaders.some(h => h.toLowerCase() === sh.toLowerCase())) {
                    allHeaders.push(sh);
                }
            });

            let courseMap = null;
            if (allHeaders.some(h => h.trim().toLowerCase() === 'subjects')) {
                const courses = await prisma.course.findMany({ select: { id: true, name: true } });
                courseMap = {};
                courses.forEach(c => courseMap[c.id] = c.name);
            }

            const rows = values.slice(1).map((row, index) => {
                let rowObj = { _rowIndex: index + 2, _spreadsheetId: spreadsheetId }; // Track which sheet
                allHeaders.forEach((h, i) => {
                    let val = row[i] || '';
                    if (h.trim().toLowerCase() === 'subjects' && val && typeof val === 'string' && val.trim().startsWith('[')) {
                        try {
                            const ids = JSON.parse(val.trim());
                            if (Array.isArray(ids)) {
                                val = ids.map(id => (courseMap && courseMap[id]) ? courseMap[id] : id).join(', ');
                            }
                        } catch(e) {}
                    }
                    rowObj[h] = val;
                });
                return rowObj;
            });
            
            allRows.push(...rows);
        }

        res.status(200).json({ headers: allHeaders, rows: allRows });
    } catch(err) {`);

fs.writeFileSync('backend/controllers/aiVerificationController.js', controllerCode);
