const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const csv = require('csv-parser');
const stream = require('stream');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const gsheetCache = require('../utils/gsheetCache');

// Helper: Get Gemini Keys from DB
const getGeminiKeys = async () => {
    let keys = [];
    try {
        const setting1 = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
        const setting2 = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY_2' } });
        if (setting1 && setting1.value) keys.push(setting1.value);
        if (setting2 && setting2.value) keys.push(setting2.value);
    } catch(e) {
        // Fallback
    }
    if (keys.length === 0 && process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    return keys;
};

// Helper: Fetch all transactions from all sheets and tabs for a given month
const fetchGSheetTransactions = async (statementMonth) => {
    try {
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (!configSetting || !configSetting.value) return { headers: [], rows: [] };

        const configs = JSON.parse(configSetting.value);
        let spreadsheetIds = [];
        for (const folderName in configs) {
            if (configs[folderName][statementMonth] && Array.isArray(configs[folderName][statementMonth])) {
                spreadsheetIds.push(...configs[folderName][statementMonth]);
            }
        }

        if (spreadsheetIds.length === 0) return { headers: [], rows: [] };

        let allHeaders = [];
        let allRows = [];

        for (const spreadsheetId of spreadsheetIds) {
            let values = [];
            let allSheetValues = [];
            if (true) {
                const apiKey = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
                const { google } = require('googleapis');
                const sheets = google.sheets({ version: 'v4', auth: apiKey });

                try {
                    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
                    const sheetTitles = sheetMetadata.data.sheets.map(s => s.properties.title);
                    
                    if (sheetTitles.length > 0) {
                        const ranges = sheetTitles.map(t => `'${t}'!A:Z`);
                        const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
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
                allSheetValues.push({ sheetName: 'Sheet1', values: values });
            }

            if (allSheetValues.length === 0) continue;

            for (const { sheetName, values } of allSheetValues) {
                const headers = values[0];
                if (allHeaders.length === 0) allHeaders = headers;

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
                    let rowObj = { _rowIndex: index + 2, _spreadsheetId: spreadsheetId, _sheetName: sheetName, isMatched: false };
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
                    
                    const keys = Object.keys(rowObj);
                    
                    const dateKey = keys.find(k => k.toLowerCase() === 'date' || k.toLowerCase() === 'txndate');
                    rowObj.txnDate = dateKey ? rowObj[dateKey] : '';
                    
                    const amountKey = keys.find(k => k.toLowerCase() === 'amount' || k.toLowerCase() === 'cr' || k.toLowerCase() === 'credit');
                    rowObj.amount = amountKey ? rowObj[amountKey] : '';
                    
                    const refKey = keys.find(k => k.toLowerCase() === 'ref' || k.toLowerCase() === 'description' || k.toLowerCase().includes('refarance') || k.toLowerCase() === 'desc' || k.toLowerCase() === 'serial reference' || k.toLowerCase() === 'seriel refarance');
                    rowObj.description = refKey ? rowObj[refKey] : '';
                    
                    if(rowObj.Status && rowObj.Status.toLowerCase() === 'verified') rowObj.isMatched = true;

                    return rowObj;
                });
                
                allRows.push(...rows);
            }
        }
        return { headers: allHeaders, rows: allRows };
    } catch(err) {
        console.error("Error in fetchGSheetTransactions:", err);
        return { headers: [], rows: [] };
    }
};


// Password Authentication Endpoints
exports.verifyPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: "Password is required" });
        }
        
        const stored = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_PASSWORD' } });
        let isValid = false;
        
        if (!stored) {
            // Default password is 'ima123'
            isValid = (password === 'ima123');
        } else {
            isValid = await bcrypt.compare(password, stored.value);
        }
        
        res.status(200).json({ success: isValid });
    } catch (error) {
        res.status(500).json({ error: "Authentication failed" });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Both current and new passwords are required" });
        }
        
        const stored = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_PASSWORD' } });
        let isValid = false;
        
        if (!stored) {
            isValid = (currentPassword === 'ima123');
        } else {
            isValid = await bcrypt.compare(currentPassword, stored.value);
        }
        
        if (!isValid) {
            return res.status(400).json({ error: "Invalid current password" });
        }
        
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.appSetting.upsert({
            where: { key: 'AI_SLIP_VERIFICATION_PASSWORD' },
            update: { value: hashed },
            create: { key: 'AI_SLIP_VERIFICATION_PASSWORD', value: hashed }
        });
        
        res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to change password" });
    }
};

// Config Endpoints
exports.getConfig = async (req, res) => {
    try {
        const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_CONFIG' } });
        const settingsSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_SETTINGS' } });
        
        res.status(200).json({
            apiKey: apiKeySetting ? apiKeySetting.value : '',
            banks: configSetting ? JSON.parse(configSetting.value) : [],
            settings: settingsSetting ? JSON.parse(settingsSetting.value) : { activeBank: '', activeSlips: [] }
        });
    } catch(error) {
        res.status(500).json({ error: "Failed to load configurations" });
    }
};

exports.saveConfig = async (req, res) => {
    try {
        const { apiKey, banks } = req.body;
        
        if (apiKey !== undefined) {
            await prisma.appSetting.upsert({
                where: { key: 'GEMINI_API_KEY' },
                update: { value: apiKey },
                create: { key: 'GEMINI_API_KEY', value: apiKey }
            });
        }
        
        if (banks !== undefined) {
            await prisma.appSetting.upsert({
                where: { key: 'AI_SLIP_VERIFICATION_CONFIG' },
                update: { value: JSON.stringify(banks) },
                create: { key: 'AI_SLIP_VERIFICATION_CONFIG', value: JSON.stringify(banks) }
            });
        }
        
        res.status(200).json({ message: "Configuration saved successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save configuration" });
    }
};

exports.saveActiveSettings = async (req, res) => {
    try {
        const { activeBank, activeSlips, gsheetTree } = req.body;
        
        const existing = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_SETTINGS' } });
        let existingVal = existing && existing.value ? JSON.parse(existing.value) : {};
        
        if (activeBank !== undefined) existingVal.activeBank = activeBank;
        if (activeSlips !== undefined) existingVal.activeSlips = activeSlips;
        if (gsheetTree !== undefined) existingVal.gsheetTree = gsheetTree;

        await prisma.appSetting.upsert({
            where: { key: 'AI_SLIP_VERIFICATION_SETTINGS' },
            update: { value: JSON.stringify(existingVal) },
            create: { key: 'AI_SLIP_VERIFICATION_SETTINGS', value: JSON.stringify(existingVal) }
        });
        res.status(200).json({ message: "Active settings saved successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save active settings" });
    }
};

exports.uploadRefSlip = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No reference file uploaded" });
        }
        res.status(200).json({ fileUrl: `/storage/documents/${req.file.filename}` });
    } catch (error) {
        res.status(500).json({ error: "Reference upload failed" });
    }
};

exports.addManualTransaction = async (req, res) => {
    try {
        const { txnDate, description, amount, statementMonth } = req.body;
        if (!txnDate || !description || !amount || !statementMonth) {
            return res.status(400).json({ error: "All transaction fields are required" });
        }
        
        const created = await prisma.bankTransaction.create({
            data: {
                txnDate: new Date(txnDate),
                description: String(description).trim(),
                amount: parseFloat(amount),
                statementMonth: String(statementMonth).trim()
            }
        });
        
        res.status(200).json({ success: true, transaction: created });
    } catch (error) {
        res.status(500).json({ error: "Failed to manually add transaction" });
    }
};

// Existing Settings legacy handlers (fallback mapping)
exports.getSettings = async (req, res) => {
    try {
        const setting = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
        res.status(200).json({ apiKey: setting ? setting.value : '' });
    } catch(error) {
        res.status(500).json({ error: "Failed to load settings" });
    }
};

exports.saveSettings = async (req, res) => {
    try {
        const { apiKey } = req.body;
        await prisma.appSetting.upsert({
            where: { key: 'GEMINI_API_KEY' },
            update: { value: apiKey },
            create: { key: 'GEMINI_API_KEY', value: apiKey }
        });
        res.status(200).json({ message: "Settings saved successfully" });
    } catch(error) {
        res.status(500).json({ error: "Failed to save settings" });
    }
};

// Upload Bank Statement (Parses Excel/CSV)

exports.uploadBankStatement = async (req, res) => {
    const { month, bankName, spreadsheetUrl } = req.body;
    if (!spreadsheetUrl) {
        return res.status(400).json({ error: "Google Sheet URL is required" });
    }
    if (!month) {
        return res.status(400).json({ error: "Target month is required" });
    }

    try {
        let spreadsheetId = spreadsheetUrl;
        const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
            spreadsheetId = match[1];
        }

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        let configs = {};
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (configSetting && configSetting.value) {
            configs = JSON.parse(configSetting.value);
        }

        configs[month] = { bankName, spreadsheetId };

        await prisma.appSetting.upsert({
            where: { key: 'GSHEET_CONFIGS' },
            update: { value: JSON.stringify(configs) },
            create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configs) }
        });

        res.status(200).json({ 
            message: "Google Sheet linked successfully!"
        });

    } catch (error) {
        console.error("[uploadBankStatement] Error:", error);
        res.status(500).json({ error: "Failed to link Google Sheet" });
    }
};

exports.clearBankStatements = async (req, res) => {
    try {
        const { month } = req.params;
        if (!month) return res.status(400).json({ error: "Month is required" });
        
        await prisma.bankTransaction.deleteMany({
            where: { statementMonth: month }
        });
        
        res.status(200).json({ message: "Successfully cleared bank statements for " + month });
    } catch (err) {
        console.error("Failed to clear statements", err);
        res.status(500).json({ error: "Failed to clear statements" });
    }
};

exports.getPendingSlips = async (req, res) => {
    try {
        const { businessId, batchId, includeApproved, status } = req.query;
        let where = {
            slip_image: { not: null }
        };

        if (status !== undefined && status !== '') {
            where.status = parseInt(status);
        } else if (includeApproved !== 'true') {
            where.status = 0;
        }

        if (businessId && businessId !== '') where.businessId = parseInt(businessId);
        if (batchId && batchId !== '') where.batchId = parseInt(batchId);

        const slips = await prisma.payment.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: 2000,
            include: { 
                student: { select: { firstName: true, lastName: true, phone: true } },
                actionedUser: { select: { firstName: true, lastName: true } },
                group: { select: { name: true } }
            }
        });

        // Map Subject/Course IDs to names
        const courses = await prisma.course.findMany({ select: { id: true, name: true } });
        const courseMap = {};
        courses.forEach(c => courseMap[c.id] = c.name);

        const today = new Date();

        const processedSlips = slips.map(slip => {
            let subjectNames = slip.subjects;
            if (slip.subjects && slip.subjects.startsWith('[')) {
                try {
                    const ids = JSON.parse(slip.subjects);
                    if (Array.isArray(ids)) {
                        subjectNames = ids.map(id => courseMap[id] || id).join(', ');
                    }
                } catch(e) {}
            }

            let currentStatus = 'Pending';
            if (slip.status === 5) currentStatus = 'Trash';
            else if (slip.status === 4 && slip.valid_until && new Date(slip.valid_until) < today) {
                currentStatus = 'Pending';
            }
            else if (slip.status === 0 && slip.method === 'Upcoming') currentStatus = 'Upcoming';
            else if (slip.status === 0) currentStatus = 'Pending';
            else if (slip.status === 1) {
                if (slip.amount === 0 && slip.remark && slip.remark.includes('Free Card')) currentStatus = 'Free Card';
                else if (slip.remark && slip.remark.includes('Custom Breakdown')) currentStatus = 'Discount';
                else currentStatus = 'Approved';
            }
            else if (slip.status === 2) currentStatus = 'Rejected';
            else if (slip.status === 3) currentStatus = 'Non Paid';
            else if (slip.status === 4) currentStatus = 'Post Pay';

            return {
                ...slip,
                subjectsStr: subjectNames,
                statusStr: currentStatus
            };
        });

        res.status(200).json(processedSlips);
    } catch(err) {
        res.status(500).json({ error: "Failed to fetch pending slips" });
    }
};


exports.getBankStatementMonths = async (req, res) => {
    try {
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        if (configSetting && configSetting.value) {
            const configs = JSON.parse(configSetting.value);
            const allMonths = new Set();
            for (const folderName in configs) {
                Object.keys(configs[folderName]).forEach(month => allMonths.add(month));
            }
            return res.status(200).json(Array.from(allMonths));
        }
        res.status(200).json([]);
    } catch(err) {
        res.status(500).json({ error: "Failed to fetch months" });
    }
};

function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType
        },
    };
}

// Gemini Custom Slip Parsing & Auto-Match Logic

exports.verifySinglePayment = async (req, res) => {
    try {
        const { paymentId, statementMonth, autoVerify = true, autoDetect = false } = req.body;
        
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { student: true }
        });

        if (!payment) return res.status(404).json({ error: "Payment not found" });
        if (!payment.slip_image) return res.status(400).json({ error: "No slip image attached to this payment" });

        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_CONFIG' } });
        const settingsSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_SETTINGS' } });

        const banks = configSetting ? JSON.parse(configSetting.value) : [];
        const activeSettings = settingsSetting ? JSON.parse(settingsSetting.value) : { activeBank: '', activeSlips: [] };

        let activeBankConfig, activeSlipConfigs;

        if (!autoDetect) {
            if (!activeSettings.activeBank) return res.status(400).json({ error: "No active Bank is configured." });
            activeBankConfig = banks.find(b => b.bankName === activeSettings.activeBank);
            if (!activeBankConfig || !activeBankConfig.slips || activeBankConfig.slips.length === 0) {
                return res.status(400).json({ error: "Active bank config missing." });
            }
            activeSlipConfigs = activeBankConfig.slips.filter(s => activeSettings.activeSlips.includes(s.name));
            if (activeSlipConfigs.length === 0) return res.status(400).json({ error: "No active Slip Types." });
        }

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

        let prompt = '';
        if (autoDetect) {
            const allTemplatesList = banks.map(b => b.bankName + " (" + (b.slips || []).map(s => s.name).join(", ") + ")").join("; ");
            prompt = `
You are an expert AI bank slip reader.
We have the following bank templates configured: ${allTemplatesList}
First, carefully analyze the slip and identify which bank and slip template this image matches from the list above.
Then, extract:
- matched_bank: The identified bank name exactly as listed.
- matched_slip_type: The identified slip template name exactly as listed.
- transaction_id: (The unique bank transaction reference number. Look for 'DEPOSITOR RELATED REFERENCE', 'REF', or any 9 to 12 digit number. Do NOT extract short 'RECORD NO'. Return null if unreadable)
- amount: (The transfer amount as a decimal number, e.g. 5000.00, without commas)
- date: (The exact transaction date from the slip, converted to YYYY-MM-DD format. Return null if unreadable. NEVER guess the date)

Provide output ONLY as valid JSON.
Format:
{
  "matched_bank": "Name",
  "matched_slip_type": "Name",
  "transaction_id": "Extracted Reference Number or null",
  "amount": 5000.00,
  "date": "YYYY-MM-DD or null"
}
`;
        } else {
            prompt = `
You are an expert AI bank slip reader for the bank "${activeSettings.activeBank}".
Analyze the slip carefully.
Extract:
- transaction_id: (The unique bank transaction reference number. Look for 'DEPOSITOR RELATED REFERENCE', 'REF', or any 9 to 12 digit number. Do NOT extract short 'RECORD NO'. Return null if unreadable)
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
`;
        }

        let extracted = null;
        let lastError = null;

        try {
            const apiKeys = await getGeminiKeys();
            if (apiKeys.length === 0) throw new Error("Gemini API key not found in Settings!");
            const { GoogleGenAI } = require('@google/genai');
            
            const filePart = {
                inlineData: {
                    data: require('fs').readFileSync(filePathLocal).toString("base64"),
                    mimeType
                }
            };
            
            for (const key of apiKeys) {
                try {
                    const ai = new GoogleGenAI({ apiKey: key });
                    const response = await ai.models.generateContent({
                        model: "gemini-3.5-flash",
                        contents: [prompt, filePart]
                    });
                    
                    const text = response.text.trim();
                    let cleanText = text;
                    if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
                    if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);
                    
                    extracted = JSON.parse(cleanText.trim());
                    break; // Success, break out of loop
                } catch(err) {
                    lastError = err;
                    console.log("Gemini API Key failed, trying next... Error:", err.message);
                    continue;
                }
            }
            if (!extracted) throw lastError;
        } catch(error) {
            lastError = error;
        }

        if (!extracted) {
             return res.status(500).json({ error: "Failed to process with Gemini.", details: lastError?.message });
        }

        let matchMethod = '';
        let confidence = 0;
        let matchedRowIndex = -1;

        // Fetch Google Sheet data for matching from all configured sheets and tabs
        const gSheetData = await fetchGSheetTransactions(statementMonth);
        const gRows = gSheetData.rows || [];

        const cleanTxnId = extracted.transaction_id ? String(extracted.transaction_id).trim() : '';
        const targetAmount = parseFloat(payment.amount);

        let matchedRow = null;

        // Matching Logic against GSheet rows
        if (gRows.length > 0) {
            for (const row of gRows) {
                let amtVal = String(row['Amount'] || row['amount'] || row['Cr'] || row['Credit'] || row['credit'] || '');
                let rowAmount = parseFloat(amtVal.replace(/,/g, ''));
                let refVal = String(row['Ref'] || row['ref'] || row['Description'] || row['description'] || row['desc'] || '').trim();
                
                if (isNaN(rowAmount) || !refVal) continue;
                
                if (Math.abs(rowAmount - targetAmount) <= 0.1) {
                    const normRowRef = refVal.replace(/[^a-zA-Z0-9]/g, '');
                    const normTxnId = cleanTxnId.replace(/[^a-zA-Z0-9]/g, '');
                    
                    if (normTxnId && normTxnId.length >= 3 && normRowRef.includes(normTxnId)) {
                        matchedRow = row;
                        matchedRowIndex = row._rowIndex;
                        matchMethod = 'Exact Ref ID & Amount Match in GSheet';
                        confidence = 0.98;
                        break;
                    } else if (normTxnId && normTxnId.length >= 8) {
                        const coreId = normTxnId.substring(normTxnId.length - 8);
                        if (normRowRef.includes(coreId)) {
                            matchedRow = row;
                            matchedRowIndex = row._rowIndex;
                            matchMethod = 'Partial Ref ID (last 8) & Amount Match';
                            confidence = 0.90;
                            break;
                        }
                    }
                }
            }
        }

        if (matchedRowIndex !== -1 && confidence >= 0.80) {
            if (autoVerify) {
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { 
                        status: 1, 
                        aiVerified: true, 
                        aiConfidence: confidence,
                        remark: payment.remark ? `${payment.remark} | AI Verified: ${matchMethod} (${cleanTxnId})` : `AI Verified: ${matchMethod} (${cleanTxnId})`
                    }
                });

                // Write back to GSheet
                if (matchedRow && matchedRow._spreadsheetId) {
                try {
                    // Fetch headers to find column indices
                    const { google } = require('googleapis');
                    let authClient = 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw';
                    const saSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_SERVICE_ACCOUNT' } });
                    if (saSetting && saSetting.value) {
                        try {
                            const credentials = JSON.parse(saSetting.value);
                            authClient = new google.auth.GoogleAuth({
                                credentials,
                                scopes: ['https://www.googleapis.com/auth/spreadsheets']
                            });
                        } catch (e) {
                            console.error("Invalid Service Account JSON:", e);
                        }
                    }
                    const sheets = google.sheets({ version: 'v4', auth: authClient });
                    
                    const response = await sheets.spreadsheets.values.get({
                        spreadsheetId: matchedRow._spreadsheetId,
                        range: `'${matchedRow._sheetName}'!1:1`, // first row of specific sheet
                    });
                    
                    if (response.data.values && response.data.values.length > 0) {
                        const headers = response.data.values[0];
                        const sysHeaders = ['Status', 'Actioned By', 'Business', 'Batch', 'Group', 'Subjects', 'Remark'];
                        
                        // Check if sys headers exist, if not we will just append them to the end of the existing row length
                        let startColIndex = headers.length;
                        const missingHeaders = sysHeaders.filter(sh => !headers.find(h => h.toLowerCase() === sh.toLowerCase()));
                        
                        if (missingHeaders.length > 0) {
                            const newHeaderRow = [...headers];
                            missingHeaders.forEach(sh => newHeaderRow.push(sh));
                            
                            const webAppSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_WEB_APP_URL' } });
                            const webAppUrl = webAppSetting ? webAppSetting.value : null;
                            if (webAppUrl) {
                                const endColLtr = String.fromCharCode(65 + newHeaderRow.length - 1);
                                await require('axios').post(webAppUrl, {
                                    secret: "IMA_SECURE_TOKEN_2026",
                                    spreadsheetId: matchedRow._spreadsheetId,
                                    range: `'${matchedRow._sheetName}'!A1:${endColLtr}1`,
                                    values: newHeaderRow
                                }).catch(() => {});
                                missingHeaders.forEach(sh => headers.push(sh));
                            }
                        }
                        
                        // We will update the matchedRowIndex row
                        // Google sheets columns: A=0, B=1, ... 
                        // To write to specific columns without overriding others, we need the A1 notation
                        // We can just fetch the whole row, update it, and write it back.
                        const rowResponse = await sheets.spreadsheets.values.get({
                            spreadsheetId: matchedRow._spreadsheetId,
                            range: `'${matchedRow._sheetName}'!A${matchedRowIndex}:Z${matchedRowIndex}`,
                        });
                        
                        if (rowResponse.data.values && rowResponse.data.values.length > 0) {
                            let rowData = rowResponse.data.values[0];
                            
                            // Extend rowData if needed
                            while (rowData.length < startColIndex) {
                                rowData.push('');
                            }
                            
                            const fullPayment = await prisma.payment.findUnique({
                                where: { id: payment.id },
                                include: {
                                    actionedUser: true,
                                    business: true,
                                    batch: true,
                                    group: true,
                                    student: true
                                }
                            });
                            
                            const statusStr = 'Verified';
                            const actionedByStr = fullPayment.actionedUser ? `${fullPayment.actionedUser.firstName} ${fullPayment.actionedUser.lastName}` : 'AI System';
                            const businessStr = fullPayment.business ? fullPayment.business.name : 'N/A';
                            const batchStr = fullPayment.batch ? fullPayment.batch.name : 'N/A';
                            const groupStr = fullPayment.group ? fullPayment.group.name : 'N/A';
                            
                            const courses = await prisma.course.findMany({ select: { id: true, name: true } });
                            const courseMap = {};
                            courses.forEach(c => courseMap[c.id] = c.name);
                            
                            let subjectsStr = fullPayment.subjects || 'N/A';
                            if (typeof subjectsStr === 'string' && subjectsStr.trim().startsWith('[')) {
                                try {
                                    const ids = JSON.parse(subjectsStr.trim());
                                    if (Array.isArray(ids)) {
                                        subjectsStr = ids.map(id => courseMap[id] || id).join(', ');
                                    }
                                } catch (e) {}
                            }
                            
                            const remarkStr = fullPayment.remark || '';
                            
                            // For simplicity, we just push these to the end if they don't exist in headers,
                            // or update them if they do exist.
                            sysHeaders.forEach((sh, idx) => {
                                const hIdx = headers.findIndex(h => h.trim().toLowerCase() === sh.toLowerCase());
                                const vals = [statusStr, actionedByStr, businessStr, batchStr, groupStr, subjectsStr, remarkStr];
                                if (hIdx !== -1) {
                                    rowData[hIdx] = vals[idx];
                                } else {
                                    rowData.push(vals[idx]);
                                    // if it's the first time writing, we should ideally also write the header!
                                    // But since API key can't write, this code is for when service account is added.
                                }
                            });
                            // Write row back using Web App
                            const webAppSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_WEB_APP_URL' } });
                            const webAppUrl = webAppSetting ? webAppSetting.value : 'https://script.google.com/macros/s/AKfycbwKgZoSnC0FhT2a02mRXdPEXqb0y2Y_v7Z4PYsILkdImH02q79YMHeYGYOLqxbc631_EQ/exec';
                            
                            if (webAppUrl) {
                                const axios = require('axios');
                                // Calculate ending column letter based on rowData length
                                const endColLetter = String.fromCharCode(65 + rowData.length - 1);
                                const postData = {
                                    secret: "IMA_SECURE_TOKEN_2026",
                                    spreadsheetId: matchedRow._spreadsheetId,
                                    range: `'${matchedRow._sheetName}'!A${matchedRowIndex}:${endColLetter}${matchedRowIndex}`,
                                    values: rowData
                                };
                                console.log("Sending to Web App:", postData);
                                const resApp = await axios.post(webAppUrl, postData);
                                console.log('Web App Response:', resApp.data);
                                if (resApp.data !== "Success") {
                                    console.error("Web App Error:", resApp.data);
                                } else {
                                    console.log('Successfully wrote back to GSheet via Web App Proxy.');
                                }
                            } else {
                                console.warn("WARNING: Cannot write back to GSheet. No Web App URL configured.");
                            }
                        }
                    }
                } catch (gErr) {
                    console.log('Google Sheets API write failed (likely due to API Key auth limitation):', gErr.message);
                }
            }
            }

            res.status(200).json({
                success: true,
                status: autoVerify ? 'VERIFIED' : 'PENDING_CONFIRMATION',
                confidence,
                matchMethod,
                extracted,
                transaction: { id: `gsheet_row_${matchedRowIndex}` }
            });
        } else {
            const skipReason = `AI Skipped: ${matchMethod || 'No match found'}. (Extracted ID: ${extracted.transaction_id || 'null'}, Amount: ${extracted.amount || 'null'})`;
            await prisma.payment.update({
                where: { id: payment.id },
                data: { aiVerified: false, aiConfidence: confidence || 0.1, remark: payment.remark ? `${payment.remark} | ${skipReason}` : skipReason }
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
        const { paymentIds, statementMonth, autoVerify = true } = req.body;
        if (paymentIds && paymentIds.length === 1) {
            req.body.paymentId = paymentIds[0];
            req.body.autoVerify = autoVerify;
            return exports.verifySinglePayment(req, res);
        }
        res.status(200).json({ processed: 0, results: [] });
    } catch (error) {
        res.status(500).json({ error: "AI Verification failed" });
    }
};


exports.getBankTransactions = async (req, res) => {
    try {
        const { statementMonth } = req.query;
        if (!statementMonth) return res.status(200).json({ headers: [], rows: [] });

        const result = await fetchGSheetTransactions(statementMonth);
        res.status(200).json(result);
    } catch(err) {
        console.error("[getBankTransactions] Error:", err.message);
        res.status(500).json({ error: "Failed to fetch transactions from Google Sheet" });
    }
};

exports.executeCommand = async (req, res) => {
    try {
        const { command, pendingPaymentIds, exampleSlipConfigName, statementMonth } = req.body;
        if (!command) return res.status(400).json({ error: "Command is required" });

        const lowerCommand = command.toLowerCase();

        // 1. FILTERING LOGIC
        if (lowerCommand.includes('filter') || lowerCommand.includes('find') || lowerCommand.includes('ona') || lowerCommand.includes('gannawa') || lowerCommand.includes('scan')) {
            if (!exampleSlipConfigName) return res.status(400).json({ error: "Example slip type is required for filtering" });
            if (!pendingPaymentIds || !pendingPaymentIds.length) return res.status(400).json({ error: "No pending payments to filter" });

            const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_CONFIG' } });
            const banks = configSetting ? JSON.parse(configSetting.value) : [];
            let targetSlipConfig = null;
            let targetBankName = null;
            for (const b of banks) {
                const found = b.slips?.find(s => s.name === exampleSlipConfigName);
                if (found) { targetSlipConfig = found; targetBankName = b.bankName; break; }
            }

            if (!targetSlipConfig) return res.status(400).json({ error: "Template configuration not found in DB." });

            let refFilePart = null;
            if (targetSlipConfig.mediaUrl) {
                const refFileName = path.basename(targetSlipConfig.mediaUrl);
                const refFilePath = path.join(process.cwd(), 'storage/documents', refFileName);
                if (fs.existsSync(refFilePath)) {
                    const ext = path.extname(refFilePath).toLowerCase();
                    let mimeType = 'image/jpeg';
                    if (ext === '.png') mimeType = 'image/png';
                    else if (ext === '.webp') mimeType = 'image/webp';
                    else if (ext === '.pdf') mimeType = 'application/pdf';
                    refFilePart = fileToGenerativePart(refFilePath, mimeType);
                }
            }

            // Fetch up to 50 slips to avoid timeouts (adjust as needed for prod)
            const maxToScan = Math.min(pendingPaymentIds.length, 50);
            const scanIds = pendingPaymentIds.slice(0, maxToScan);

            const payments = await prisma.payment.findMany({
                where: { id: { in: scanIds }, slip_image: { not: null } },
                select: { id: true, slip_image: true }
            });

            const matchedIds = [];

            const checkSlip = async (payment) => {

                try {
                    const firstSlipFileName = payment.slip_image.split(',')[0].trim();
                    const cleanFileName = path.basename(firstSlipFileName);
                    const filePath = path.join(process.cwd(), 'storage/documents', cleanFileName);
                    
                    if (!fs.existsSync(filePath)) return;

                    const ext = path.extname(filePath).toLowerCase();
                    let mimeType = 'image/jpeg';
                    if (ext === '.png') mimeType = 'image/png';
                    else if (ext === '.webp') mimeType = 'image/webp';
                    else if (ext === '.pdf') mimeType = 'application/pdf';

                    const filePart = fileToGenerativePart(filePath, mimeType);
                    
                    const parts = [];
                    if (refFilePart) {
                        const prompt = `You are a bank slip categorization assistant. You will be provided with TWO images:
1) A REFERENCE TEMPLATE image (Image 1) representing a "${targetSlipConfig.name}" slip for "${targetBankName}".
2) A USER UPLOADED slip image (Image 2).

CRITICAL RULE: Compare the bank logo and name on Image 2 with Image 1. If Image 2 clearly belongs to a DIFFERENT bank, you MUST reply NO immediately.
If it DOES belong to the same bank, does Image 2 visually match the format, structure, and characteristics of the slip type shown in Image 1?
Additional rules to check:
${targetSlipConfig.rules}

Reply strictly with a single word: YES if Image 2 matches the bank and slip type of Image 1, NO if it does not match.`;
                        parts.push(prompt);
                        parts.push(refFilePart); // Image 1 (Reference)
                        parts.push(filePart);    // Image 2 (User uploaded)
                    } else {
                        const prompt = `You are a bank slip categorization assistant. Look at the attached image.
CRITICAL RULE: First, verify if this slip belongs to "${targetBankName}". 
(Note: Treat acronyms like BOC as Bank of Ceylon, COMBANK as Commercial Bank, HNB as Hatton National Bank, etc.)
If the bank logo or bank name clearly belongs to a DIFFERENT bank and NOT "${targetBankName}" or its variations, you MUST reply NO immediately.

If it DOES belong to "${targetBankName}", does this image match the format and characteristics of the slip type: "${targetSlipConfig.name}"?
Here are the defining rules for this slip type:
${targetSlipConfig.rules}

Reply strictly with a single word: YES if it matches BOTH the bank AND the slip type, NO if it does not match.`;
                        parts.push(prompt);
                        parts.push(filePart);
                    }

                    const apiKeys = await getGeminiKeys();
                    if (apiKeys.length === 0) throw new Error("Gemini API key not found in Settings!");
                    const { GoogleGenAI } = require('@google/genai');
                    
                    let text = "";
                    let success = false;
                    for (const key of apiKeys) {
                        try {
                            const ai = new GoogleGenAI({ apiKey: key });
                            const response = await ai.models.generateContent({
                                model: "gemini-3.5-flash",
                                contents: parts
                            });
                            text = response.text.trim().toUpperCase();
                            success = true;
                            break;
                        } catch (err) {
                            console.log("Batch Gemini API Key failed, trying next... Error:", err.message);
                            continue;
                        }
                    }
                    if (!success) throw new Error("All Gemini API keys failed.");
                    
                    if (text.includes('YES')) {
                        matchedIds.push(payment.id);
                    }
                } catch(e) {
                    console.error(`Error classifying slip ${payment.id}:`, e.message);
                }
            };

            // Process concurrently in chunks of 10 to avoid rate limits
            const chunkSize = 10;
            for (let i = 0; i < payments.length; i += chunkSize) {
                const chunk = payments.slice(i, i + chunkSize);
                await Promise.all(chunk.map(p => checkSlip(p)));
            }

            return res.status(200).json({
                action: 'FILTERED',
                message: `AI scanned ${payments.length} slips and found ${matchedIds.length} matching '${exampleSlipConfigName}'`,
                matchedPaymentIds: matchedIds
            });
        }
        
        // 2. VERIFY LOGIC
        if (lowerCommand.includes('verify') || lowerCommand.includes('check') || lowerCommand.includes('karan')) {
            const numMatch = lowerCommand.match(/\d+/);
            const count = numMatch ? parseInt(numMatch[0]) : 10;
            
            return res.status(200).json({
                action: 'VERIFY',
                count: count,
                message: `Starting verification sequence for ${count} slips...`
            });
        }

        return res.status(200).json({
            action: 'UNKNOWN',
            message: "Command not recognized. Try 'filter these slips' or 'verify 10 slips'."
        });

    } catch (error) {
        console.error("[executeCommand] Error:", error);
        res.status(500).json({ error: "Failed to execute command" });
    }
};


exports.createMonth = async (req, res) => {
    try {
        const { month } = req.body;
        if (!month) return res.status(400).json({ error: "Month is required" });

        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        let configs = {};
        if (configSetting && configSetting.value) {
            configs = JSON.parse(configSetting.value);
        }
        
        if (!configs[month]) {
            configs[month] = {};
            await prisma.appSetting.upsert({
                where: { key: 'GSHEET_CONFIGS' },
                update: { value: JSON.stringify(configs) },
                create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configs) }
            });
        }
        
        res.status(200).json({ message: "Month created successfully" });
    } catch(err) {
        res.status(500).json({ error: "Failed to create month" });
    }
};

exports.deleteMonth = async (req, res) => {
    try {
        const { month } = req.params;
        if (!month) return res.status(400).json({ error: "Month is required" });

        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        let configs = {};
        if (configSetting && configSetting.value) {
            configs = JSON.parse(configSetting.value);
        }
        
        if (configs[month]) {
            delete configs[month];
            await prisma.appSetting.upsert({
                where: { key: 'GSHEET_CONFIGS' },
                update: { value: JSON.stringify(configs) },
                create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configs) }
            });
        }
        
        res.status(200).json({ message: "Month deleted successfully" });
    } catch(err) {
        res.status(500).json({ error: "Failed to delete month" });
    }
};

exports.getTemplates = async (req, res) => {
    try {
        const setting = await prisma.appSetting.findUnique({ where: { key: 'AI_BANK_TEMPLATES' } });
        let templates = [];
        if (setting && setting.value) {
            templates = JSON.parse(setting.value);
        }
        res.status(200).json({ templates });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load templates" });
    }
};

exports.saveTemplate = async (req, res) => {
    try {
        const { id, bankName, prompt } = req.body;
        let imageUrl = req.body.existingImage || '';
        
        if (req.file) {
            imageUrl = '/storage/documents/' + req.file.filename;
        }

        const setting = await prisma.appSetting.findUnique({ where: { key: 'AI_BANK_TEMPLATES' } });
        let templates = [];
        if (setting && setting.value) {
            templates = JSON.parse(setting.value);
        }

        const templateData = {
            id: id || Date.now().toString(),
            bankName,
            prompt,
            imageUrl,
            updatedAt: new Date().toISOString()
        };

        const existingIndex = templates.findIndex(t => t.id === templateData.id);
        if (existingIndex >= 0) {
            templates[existingIndex] = templateData;
        } else {
            templates.push(templateData);
        }

        await prisma.appSetting.upsert({
            where: { key: 'AI_BANK_TEMPLATES' },
            update: { value: JSON.stringify(templates) },
            create: { key: 'AI_BANK_TEMPLATES', value: JSON.stringify(templates) }
        });

        res.status(200).json({ message: "Template saved successfully", template: templateData });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save template" });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const setting = await prisma.appSetting.findUnique({ where: { key: 'AI_BANK_TEMPLATES' } });
        if (!setting || !setting.value) return res.status(404).json({ error: "No templates found" });

        let templates = JSON.parse(setting.value);
        templates = templates.filter(t => t.id !== id);

        await prisma.appSetting.upsert({
            where: { key: 'AI_BANK_TEMPLATES' },
            update: { value: JSON.stringify(templates) },
            create: { key: 'AI_BANK_TEMPLATES', value: JSON.stringify(templates) }
        });

        res.status(200).json({ message: "Template deleted successfully" });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete template" });
    }
};


exports.getGsheetConfigTree = async (req, res) => {
    try {
        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        let configs = {};
        if (configSetting && configSetting.value) {
            configs = JSON.parse(configSetting.value);
            // Migrate old structure if necessary
            if (Object.keys(configs).length > 0 && !Object.keys(configs)[0].includes("Folder") && Object.values(configs)[0] && typeof Object.values(configs)[0] === 'object' && Object.values(configs)[0].spreadsheetId) {
                const migrated = { "Default Folder": {} };
                for (const [month, data] of Object.entries(configs)) {
                    migrated["Default Folder"][month] = [data.spreadsheetId];
                }
                configs = migrated;
                await prisma.appSetting.upsert({
                    where: { key: 'GSHEET_CONFIGS' },
                    update: { value: JSON.stringify(configs) },
                    create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configs) }
                });
            }
        }
        res.status(200).json(configs);
    } catch(err) {
        console.error("Error in getGsheetConfigTree:", err);
        res.status(500).json({ error: "Failed to fetch gsheet config" });
    }
};

exports.saveGsheetConfigTree = async (req, res) => {
    try {
        const { tree, configs } = req.body;
        const configData = tree || configs;
        await prisma.appSetting.upsert({
            where: { key: 'GSHEET_CONFIGS' },
            update: { value: JSON.stringify(configData) },
            create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configData) }
        });
        res.status(200).json({ message: "Config saved successfully" });
    } catch(err) {
        console.error("Error in saveGsheetConfigTree:", err);
        res.status(500).json({ error: "Failed to save gsheet config" });
    }
};
