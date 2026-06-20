const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';

let content = fs.readFileSync(filePath, 'utf8');

const getBankTransactionsOld = `exports.getBankTransactions = async (req, res) => {
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
    } catch (error) {
        console.error('Error fetching bank transactions from GSheet:', error);
        res.status(500).json({ error: "Failed to fetch bank transactions" });
    }
};`;

const getBankTransactionsNew = `exports.getBankTransactions = async (req, res) => {
    try {
        const { statementMonth } = req.query;
        if (!statementMonth) return res.status(200).json({ headers: [], rows: [] });

        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (!configSetting || !configSetting.value) return res.status(200).json({ headers: [], rows: [] });

        const configs = JSON.parse(configSetting.value);
        if (!configs[statementMonth]) return res.status(200).json({ headers: [], rows: [] });

        const spreadsheetId = configs[statementMonth].spreadsheetId;
        
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

        const baseHeaders = values[0];
        const sysHeaders = ['[Sys] Status', '[Sys] Actioned By', '[Sys] Business', '[Sys] Batch', '[Sys] Group', '[Sys] Subjects'];
        
        // Merge headers ensuring no duplicates if GSheet already has them
        const headers = [...baseHeaders];
        sysHeaders.forEach(sh => {
            if (!headers.includes(sh)) headers.push(sh);
        });

        let rows = values.slice(1).map((row, index) => {
            let rowObj = { _rowIndex: index + 2 };
            headers.forEach((h, i) => {
                rowObj[h] = row[i] || '';
            });
            return rowObj;
        });

        // Query local payments to map data
        const payments = await prisma.payment.findMany({
            where: { status: { not: 0 } },
            include: {
                actionedUser: true,
                business: true,
                batch: true,
                group: true,
                student: { include: { subjects: { include: { subject: true } } } }
            }
        });

        const amountIndex = baseHeaders.findIndex(h => h.toLowerCase().includes('amount') || h.toLowerCase().includes('cr') || h.toLowerCase().includes('credit'));
        const refIndex = baseHeaders.findIndex(h => h.toLowerCase().includes('ref') || h.toLowerCase().includes('description') || h.toLowerCase().includes('desc'));

        if (amountIndex !== -1 && refIndex !== -1) {
            rows = rows.map(rowObj => {
                const rowAmount = parseFloat(String(rowObj[baseHeaders[amountIndex]]).replace(/,/g, ''));
                const rowRef = rowObj[baseHeaders[refIndex]] ? String(rowObj[baseHeaders[refIndex]]).toLowerCase().trim() : '';

                if (isNaN(rowAmount)) return rowObj;

                // Find matching payment
                const matchedPayment = payments.find(p => {
                    const targetAmount = parseFloat(p.amount);
                    const cleanTxnId = p.transaction_id ? String(p.transaction_id).toLowerCase().trim() : '';
                    if (Math.abs(rowAmount - targetAmount) <= 0.1 && cleanTxnId && cleanTxnId.length >= 3 && rowRef.includes(cleanTxnId)) {
                        return true;
                    }
                    return false;
                });

                if (matchedPayment) {
                    const statusStr = matchedPayment.status === 1 ? 'Verified' : 'Rejected';
                    const actionedByStr = matchedPayment.actionedUser ? \`\${matchedPayment.actionedUser.firstName} \${matchedPayment.actionedUser.lastName}\` : (matchedPayment.aiVerified ? 'AI System' : 'System');
                    const businessStr = matchedPayment.business ? matchedPayment.business.name : 'N/A';
                    const batchStr = matchedPayment.batch ? matchedPayment.batch.name : 'N/A';
                    const groupStr = matchedPayment.group ? matchedPayment.group.name : 'N/A';
                    const subjectsStr = matchedPayment.student && matchedPayment.student.subjects ? matchedPayment.student.subjects.map(s => s.subject.name).join(', ') : 'N/A';

                    // Update row object with matched system data if it isn't already filled by GSheet
                    rowObj['[Sys] Status'] = rowObj['[Sys] Status'] || statusStr;
                    rowObj['[Sys] Actioned By'] = rowObj['[Sys] Actioned By'] || actionedByStr;
                    rowObj['[Sys] Business'] = rowObj['[Sys] Business'] || businessStr;
                    rowObj['[Sys] Batch'] = rowObj['[Sys] Batch'] || batchStr;
                    rowObj['[Sys] Group'] = rowObj['[Sys] Group'] || groupStr;
                    rowObj['[Sys] Subjects'] = rowObj['[Sys] Subjects'] || subjectsStr;
                }

                return rowObj;
            });
        }

        res.status(200).json({ headers, rows });
    } catch (error) {
        console.error('Error fetching bank transactions from GSheet:', error);
        res.status(500).json({ error: "Failed to fetch bank transactions" });
    }
};`;

content = content.replace(getBankTransactionsOld, getBankTransactionsNew);
fs.writeFileSync(filePath, content);
console.log('Replaced getBankTransactions');
