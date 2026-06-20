const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';
let content = fs.readFileSync(filePath, 'utf8');

const newTransactionsLogic = `
exports.getBankTransactions = async (req, res) => {
    try {
        const { statementMonth } = req.query;
        if (!statementMonth) return res.status(200).json({ headers: [], rows: [] });

        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (!configSetting || !configSetting.value) return res.status(200).json({ headers: [], rows: [] });

        const configs = JSON.parse(configSetting.value);
        if (!configs[statementMonth]) return res.status(200).json({ headers: [], rows: [] });

        const spreadsheetId = configs[statementMonth].spreadsheetId;
        
        const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
        // Assume API key might be stored somewhere, or we can use the one hardcoded if missing.
        // Wait, the user said: AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw
        const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';

        const { google } = require('googleapis');
        const sheets = google.sheets({ version: 'v4', auth: apiKey });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:Z',
        });

        const values = response.data.values;
        if (!values || values.length === 0) {
            return res.status(200).json({ headers: [], rows: [] });
        }

        const headers = values[0];
        const rows = values.slice(1).map((row, index) => {
            let rowObj = { _rowIndex: index + 2 }; // Google sheet row index (1-based, 1 is header)
            headers.forEach((h, i) => {
                rowObj[h] = row[i] || '';
            });
            return rowObj;
        });

        res.status(200).json({ headers, rows });
    } catch(err) {
        console.error("[getBankTransactions] Error:", err.message);
        res.status(500).json({ error: "Failed to fetch transactions from Google Sheet" });
    }
};
`;

const startIndex = content.indexOf('exports.getBankTransactions = async (req, res) => {');
const endIndex = content.indexOf('// Export the router'); // Or EOF
// In this case getBankTransactions is near the end, but let's check its ending properly
// Since I couldn't see the exact end, I'll replace everything from exports.getBankTransactions to the next exports. or module.exports
const searchChunk = content.slice(startIndex);
const nextExport = searchChunk.substring(10).match(/exports\.|module\.exports/);

let replaceEndIndex = -1;
if (nextExport) {
    replaceEndIndex = startIndex + 10 + nextExport.index;
} else {
    replaceEndIndex = content.length; // till end of file
}

const newContent = content.slice(0, startIndex) + newTransactionsLogic + '\n' + content.slice(replaceEndIndex);
fs.writeFileSync(filePath, newContent);
console.log('Successfully updated getBankTransactions logic in controller.');
