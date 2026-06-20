const fs = require('fs');
let content = fs.readFileSync('backend/controllers/aiVerificationController.js', 'utf-8');

const oldUpdateBlock = `
        const updateResponse = await sheets.spreadsheets.values.update({
            spreadsheetId: matchObj._spreadsheetId,
            range: \`A\${matchObj._rowIndex}\`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [['VERIFIED']]
            }
        });`;

const newUpdateBlock = `
        const rangeStr = matchObj._sheetName ? \`'\${matchObj._sheetName}'!A\${matchObj._rowIndex}\` : \`A\${matchObj._rowIndex}\`;
        const updateResponse = await sheets.spreadsheets.values.update({
            spreadsheetId: matchObj._spreadsheetId,
            range: rangeStr,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [['VERIFIED']]
            }
        });`;

content = content.replace(oldUpdateBlock, newUpdateBlock);
fs.writeFileSync('backend/controllers/aiVerificationController.js', content);
console.log("Updated verifySinglePayment");
