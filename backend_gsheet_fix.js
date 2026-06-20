const fs = require('fs');
let content = fs.readFileSync('backend/controllers/aiVerificationController.js', 'utf-8');

const oldFetchBlock = `
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
`;

const newFetchBlock = `
            let allSheetValues = [];
            if (!values || values.length === 0) {
                const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
                const { google } = require('googleapis');
                const sheets = google.sheets({ version: 'v4', auth: apiKey });

                try {
                    // Get all sheet names
                    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
                    const sheetTitles = sheetMetadata.data.sheets.map(s => s.properties.title);
                    
                    if (sheetTitles.length > 0) {
                        const ranges = sheetTitles.map(t => \`'\${t}'!A:Z\`);
                        const response = await sheets.spreadsheets.values.batchGet({
                            spreadsheetId,
                            ranges
                        });
                        
                        if (response.data.valueRanges) {
                            response.data.valueRanges.forEach((vr, i) => {
                                if (vr.values && vr.values.length > 0) {
                                    allSheetValues.push({ sheetName: sheetTitles[i], values: vr.values });
                                }
                            });
                        }
                    }
                } catch (err) {
                    console.error("Fallback GSheet fetch error:", err.message);
                }
            } else {
                // from web app fallback (assume single sheet)
                allSheetValues.push({ sheetName: 'Sheet1', values: values });
            }

            if (allSheetValues.length === 0) continue;

            for (const { sheetName, values } of allSheetValues) {
                const headers = values[0];
`;

content = content.replace(oldFetchBlock, newFetchBlock);

// Now we need to close the `for (const { sheetName, values } of allSheetValues)` loop properly.
// The original code had: `allRows.push(rowObj); }); }` right before `res.status(200).json({ headers: allHeaders, rows: allRows });`
const closingRegex = /allRows\.push\(rowObj\);\s*\}\);\s*\}/;
content = content.replace(closingRegex, "allRows.push(rowObj);\n            });\n        } // close allSheetValues loop\n    }");

// We also need to inject `_sheetName` into `rowObj`.
content = content.replace(/let rowObj = { _rowIndex: index \+ 2, _spreadsheetId: spreadsheetId };/, "let rowObj = { _rowIndex: index + 2, _spreadsheetId: spreadsheetId, _sheetName: sheetName };");

fs.writeFileSync('backend/controllers/aiVerificationController.js', content);
console.log("Backend updated!");
