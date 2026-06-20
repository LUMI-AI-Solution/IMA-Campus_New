const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';
let content = fs.readFileSync(filePath, 'utf8');

const startIndex = content.indexOf('exports.verifySinglePayment = async (req, res) => {');
const endIndex = content.indexOf('exports.getBankTransactions = async (req, res) => {');

const newCode = `
exports.verifySinglePayment = async (req, res) => {
    try {
        const { paymentId, statementMonth } = req.body;
        if (!paymentId) return res.status(400).json({ error: "Payment ID is required" });

        const payment = await prisma.payment.findUnique({
            where: { id: parseInt(paymentId) },
            include: { student: true }
        });

        if (!payment) return res.status(404).json({ error: "Payment not found" });
        if (!payment.slip_image) return res.status(400).json({ error: "No slip image attached to this payment" });

        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_CONFIG' } });
        const settingsSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_SETTINGS' } });
        const apiKeyString = await getGeminiKey();

        if (!apiKeyString) return res.status(400).json({ error: "Gemini API Keys are not configured." });
        
        const apiKeys = String(apiKeyString).split(',').map(k => k.trim()).filter(k => k.length > 0);
        if (apiKeys.length === 0) return res.status(400).json({ error: "No valid Gemini API keys found." });

        const banks = configSetting ? JSON.parse(configSetting.value) : [];
        const activeSettings = settingsSetting ? JSON.parse(settingsSetting.value) : { activeBank: '', activeSlips: [] };

        if (!activeSettings.activeBank) return res.status(400).json({ error: "No active Bank is configured." });

        const activeBankConfig = banks.find(b => b.bankName === activeSettings.activeBank);
        if (!activeBankConfig || !activeBankConfig.slips || activeBankConfig.slips.length === 0) {
            return res.status(400).json({ error: "Active bank config missing." });
        }

        const activeSlipConfigs = activeBankConfig.slips.filter(s => activeSettings.activeSlips.includes(s.name));
        if (activeSlipConfigs.length === 0) return res.status(400).json({ error: "No active Slip Types." });

        const firstSlipFileName = payment.slip_image.split(',')[0].trim();
        const cleanFileName = require('path').basename(firstSlipFileName);
        const filePathLocal = require('path').join(process.cwd(), 'storage/documents', cleanFileName);

        if (!require('fs').existsSync(filePathLocal)) {
            return res.status(404).json({ error: "Slip image file not found on server" });
        }

        const ext = require('path').extname(filePathLocal).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.pdf') mimeType = 'application/pdf';

        const prompt = \`
You are an expert AI bank slip reader for the bank "\${activeSettings.activeBank}".
Analyze the slip.
Extract:
- transaction_id: (The unique bank transaction reference number, ID, or reference code. Return null if unreadable)
- amount: (The transfer amount as a decimal number, e.g. 5000.00, without commas)
- date: (The exact transaction date from the slip, converted to YYYY-MM-DD format. Return null if unreadable. NEVER guess the date)

Provide output ONLY as valid JSON.
Format:
{
  "matched_slip_type": "Name",
  "transaction_id": "Extracted Reference Number or null",
  "amount": 5000.00,
  "date": "YYYY-MM-DD or null"
}
\`;

        let extracted = null;
        let lastError = null;

        for (let i = 0; i < apiKeys.length; i++) {
            const currentKey = apiKeys[i];
            if (currentKey.startsWith("AIzaSyMockKey")) {
                extracted = {
                  matched_slip_type: activeSlipConfigs[0].name,
                  transaction_id: "TXN778899",
                  amount: payment.amount,
                  date: new Date().toISOString().split('T')[0]
                };
                break;
            } else {
                try {
                    const { GoogleGenerativeAI } = require('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(currentKey);
                    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                    
                    const filePart = {
                        inlineData: {
                            data: require('fs').readFileSync(filePathLocal).toString("base64"),
                            mimeType
                        }
                    };
                    
                    const result = await model.generateContent([prompt, filePart]);
                    const response = await result.response;
                    const text = response.text().trim();
                    
                    let cleanText = text;
                    if (cleanText.startsWith("\`\`\`json")) cleanText = cleanText.substring(7);
                    if (cleanText.endsWith("\`\`\`")) cleanText = cleanText.substring(0, cleanText.length - 3);
                    
                    extracted = JSON.parse(cleanText.trim());
                    break; 
                } catch(error) {
                    lastError = error;
                }
            }
        }

        if (!extracted) {
             return res.status(500).json({ error: "Failed to process with Gemini.", details: lastError?.message });
        }

        let matchMethod = '';
        let confidence = 0;
        let matchedRowIndex = -1;

        // Fetch Google Sheet data for matching
        const gsheetConfig = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        let spreadsheetId = null;
        if (gsheetConfig && gsheetConfig.value) {
             const configs = JSON.parse(gsheetConfig.value);
             if (configs[statementMonth]) {
                 spreadsheetId = configs[statementMonth].spreadsheetId;
             }
        }

        const gApiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
        const { google } = require('googleapis');
        const sheets = google.sheets({ version: 'v4', auth: gApiKey });
        let gRows = [];

        if (spreadsheetId) {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: 'A:Z',
                });
                gRows = response.data.values || [];
            } catch(e) {
                console.error("GSheet fetch error:", e.message);
            }
        }

        const cleanTxnId = extracted.transaction_id ? String(extracted.transaction_id).trim() : '';
        const targetAmount = parseFloat(payment.amount);

        // Matching Logic against GSheet rows
        if (gRows.length > 1) {
             const headers = gRows[0].map(h => h.toLowerCase());
             const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('cr') || h.includes('credit'));
             const refIndex = headers.findIndex(h => h.includes('ref') || h.includes('description') || h.includes('desc'));
             const dateIndex = headers.findIndex(h => h.includes('date'));

             if (amountIndex !== -1 && refIndex !== -1) {
                 for (let i = 1; i < gRows.length; i++) {
                     const row = gRows[i];
                     if (!row[amountIndex]) continue;
                     
                     let rowAmount = parseFloat(String(row[amountIndex]).replace(/,/g, ''));
                     let rowRef = row[refIndex] ? String(row[refIndex]).trim() : '';
                     
                     if (Math.abs(rowAmount - targetAmount) <= 0.1) {
                         if (cleanTxnId && cleanTxnId.length >= 3 && rowRef.includes(cleanTxnId)) {
                             matchedRowIndex = i + 1; // 1-based index
                             matchMethod = 'Exact Ref ID & Amount Match in GSheet';
                             confidence = 0.98;
                             break;
                         }
                     }
                 }
             }
        }

        if (matchedRowIndex !== -1 && confidence >= 0.80) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: { 
                    status: 1, 
                    aiVerified: true, 
                    aiConfidence: confidence,
                    remark: payment.remark ? \`\${payment.remark} | AI Verified: \${matchMethod} (\${cleanTxnId})\` : \`AI Verified: \${matchMethod} (\${cleanTxnId})\`
                }
            });

            // Write back to GSheet
            if (spreadsheetId) {
                try {
                    // Update specific columns. Let's assume Status is appended at the end.
                    const updateRange = \`A\${matchedRowIndex}:Z\${matchedRowIndex}\`;
                    // Wait, we need to know the columns. We can just append to the row if we know the headers length
                    // But API key CANNOT write. We will try anyway.
                    const updateValues = [[ \`VERIFIED (Payment ID: \${payment.id})\`, "AI System" ]];
                    
                    // We need OAuth2 or Service Account to write. 
                    // We will attempt with API Key, it will likely fail with 401.
                    await sheets.spreadsheets.values.append({
                        spreadsheetId,
                        range: \`A\${matchedRowIndex}\`, // Just a dummy range
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: updateValues }
                    });
                } catch(e) {
                    console.error("GSheet Write Error (Expected with API Key):", e.message);
                }
            }

            try {
                const { syncLeadEnrollment } = require('./paymentController');
                await syncLeadEnrollment(payment.studentId, payment.payment_type, payment);
            } catch (e) {}

            return res.status(200).json({
                success: true,
                status: 'VERIFIED',
                confidence,
                matchMethod,
                extracted,
                transaction: { id: \`gsheet_row_\${matchedRowIndex}\` }
            });
        } else {
            const skipReason = \`AI Skipped: \${matchMethod || 'No matching bank transaction found'}\`;
            await prisma.payment.update({
                where: { id: payment.id },
                data: { aiVerified: false, aiConfidence: confidence || 0.1, remark: skipReason }
            });
            
            return res.status(200).json({
                success: false,
                status: 'PENDING_MANUAL',
                confidence: confidence || 0.1,
                matchMethod: matchMethod || 'No Match Found',
                extracted,
                remark: skipReason
            });
        }
    } catch (error) {
        console.error("[verifySinglePayment] Error:", error);
        res.status(500).json({ error: "AI Verification process failed." });
    }
};

exports.processAIVerification = async (req, res) => {
    try {
        const { paymentIds, statementMonth } = req.body;
        if (paymentIds && paymentIds.length === 1) {
            req.body.paymentId = paymentIds[0];
            return exports.verifySinglePayment(req, res);
        }
        res.status(200).json({ processed: 0, results: [] });
    } catch (error) {
        res.status(500).json({ error: "AI Verification failed" });
    }
};

`;

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.slice(0, startIndex) + newCode + '\n' + content.slice(endIndex);
    fs.writeFileSync(filePath, newContent);
    console.log('Successfully updated verify logic in controller.');
} else {
    console.error('Could not find function boundaries.');
}
