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

        if (!apiKeyString) {
            return res.status(400).json({ error: "Gemini API Keys are not configured. Please add them in AI Core Settings." });
        }
        
        const apiKeys = String(apiKeyString).split(',').map(k => k.trim()).filter(k => k.length > 0);
        if (apiKeys.length === 0) {
            return res.status(400).json({ error: "No valid Gemini API keys found." });
        }

        const banks = configSetting ? JSON.parse(configSetting.value) : [];
        const activeSettings = settingsSetting ? JSON.parse(settingsSetting.value) : { activeBank: '', activeSlips: [] };

        if (!activeSettings.activeBank) {
            return res.status(400).json({ error: "No active Bank is configured in the AI Settings." });
        }

        const activeBankConfig = banks.find(b => b.bankName === activeSettings.activeBank);
        if (!activeBankConfig || !activeBankConfig.slips || activeBankConfig.slips.length === 0) {
            return res.status(400).json({ error: `Active bank "${activeSettings.activeBank}" configuration is missing or has no slip types.` });
        }

        const activeSlipConfigs = activeBankConfig.slips.filter(s => activeSettings.activeSlips.includes(s.name));
        if (activeSlipConfigs.length === 0) {
            return res.status(400).json({ error: "No active Slip Types selected for the active bank." });
        }

        const firstSlipFileName = payment.slip_image.split(',')[0].trim();
        const cleanFileName = path.basename(firstSlipFileName); // Sanitize traversal
        const filePath = path.join(process.cwd(), 'storage/documents', cleanFileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `Slip image file not found on server at: ${filePath}` });
        }

        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.pdf') mimeType = 'application/pdf';

        let prompt = "";

        if (activeSlipConfigs.length === 1) {
            const sc = activeSlipConfigs[0];
            prompt = `
You are an expert AI bank slip reader for the bank "${activeSettings.activeBank}".
You are analyzing a slip of type: "${sc.name}".

Extraction Rules for this specific slip type:
${sc.rules}

CRITICAL INSTRUCTIONS:
1. STRICTLY follow the extraction rules above to find the data.
2. DO NOT hallucinate or guess any data.
3. If a value is unreadable, blurry, or missing, you MUST set it to null.
4. DATE EXTRACTION IS CRITICAL: Never guess the date or use today's date if the slip date is missing or unclear. Follow the exact date format rules specified in the template. Convert the final date to YYYY-MM-DD format ONLY if you are 100% sure.

You MUST extract the following standard verification fields based on the rules:
- transaction_id: (The unique bank transaction reference number, ID, or reference code. Return null if unreadable)
- amount: (The transfer amount as a decimal number, e.g. 5000.00, without commas or currency symbols)
- date: (The exact transaction date from the slip, converted to YYYY-MM-DD format. Return null if unreadable or missing. NEVER guess the date)

Provide your output ONLY as a valid JSON object. Do not include markdown code block formatting.
Format:
{
  "matched_slip_type": "${sc.name}",
  "transaction_id": "Extracted Reference Number or null",
  "amount": 5000.00,
  "date": "YYYY-MM-DD or null",
  "extracted_fields": {
     ... (other specific key-value pairs extracted based on the rules)
  }
}
`;
        } else {
            let slipsRulesPrompt = activeSlipConfigs.map((sc, i) => {
                return `Slip Type #${i+1}: "${sc.name}"\nExtraction Rules:\n${sc.rules}`;
            }).join('\n\n');

            prompt = `
You are an expert AI bank slip reader for the bank "${activeSettings.activeBank}".
Analyze the attached bank slip file and classify it into one of these active slip types:
${activeSlipConfigs.map(s => `"${s.name}"`).join(', ')}

Here are the extraction rules for each active slip type:
${slipsRulesPrompt}

CRITICAL INSTRUCTIONS:
1. Extract the relevant information from the slip strictly according to the rules of the matched slip type.
2. DATE EXTRACTION IS CRITICAL: Never guess the date or use today's date if the slip date is missing or unclear. Follow the exact date format rules specified in the template. Convert the final date to YYYY-MM-DD format ONLY if you are 100% sure.
3. If a value is unreadable or missing, set it to null.

Also, you MUST extract the following standard verification fields if they are visible:
- transaction_id: (The unique bank transaction reference number, ID, or reference code of this transfer. Return null if unreadable)
- amount: (The transfer amount as a decimal number, e.g. 5000.00, without commas or currency symbols)
- date: (The exact transaction date from the slip, converted to YYYY-MM-DD format. Return null if unreadable. NEVER guess the date)

Provide your output ONLY as a valid JSON object. Do not include markdown code block formatting.
Format:
{
  "matched_slip_type": "Name of the matched slip type",
  "transaction_id": "Extracted Reference Number or null",
  "amount": 5000.00,
  "date": "YYYY-MM-DD or null",
  "extracted_fields": {
     ... (other specific key-value pairs extracted based on the rules)
  }
}
`;
        }

        let extracted = null;
        let lastError = null;

        for (let i = 0; i < apiKeys.length; i++) {
            const currentKey = apiKeys[i];
            
            if (currentKey.startsWith("AIzaSyMockKey")) {
                console.log(`[AI Verification] Mock API key detected. Simulating Gemini output for Payment ID ${paymentId}...`);
                extracted = {
                  matched_slip_type: activeSlipConfigs[0].name,
                  transaction_id: "TXN778899",
                  amount: payment.amount,
                  date: new Date().toISOString().split('T')[0],
                  extracted_fields: {
                     "Sender Name": payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : "Test Student",
                     "Reference": "TXN778899"
                  }
                };
                break;
            } else {
                try {
                    const genAI = new GoogleGenerativeAI(currentKey);
                    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                    
                    const filePart = fileToGenerativePart(filePath, mimeType);
                    
                    console.log(`[AI Verification] Querying Gemini for Payment ID ${paymentId} using Key #${i+1}...`);
                    const result = await model.generateContent([prompt, filePart]);
                    const response = await result.response;
                    const text = response.text().trim();
                    
                    let cleanText = text;
                    if (cleanText.startsWith("```json")) {
                        cleanText = cleanText.substring(7);
                    }
                    if (cleanText.endsWith("```")) {
                        cleanText = cleanText.substring(0, cleanText.length - 3);
                    }
                    
                    extracted = JSON.parse(cleanText.trim());
                    break; // Success, exit the loop!
                } catch(error) {
                    console.error(`[AI Verification] Gemini request failed with Key #${i+1}:`, error.message);
                    lastError = error;
                    // Loop continues to the next key
                }
            }
        }

        if (!extracted) {
             console.error("[AI Verification] All provided API keys failed.");
             return res.status(500).json({ error: "Failed to process with Gemini. All API keys failed or rate limit reached.", details: lastError?.message });
        }

        console.log(`[AI Verification] Gemini output parsed successfully for Payment ID ${paymentId}:`, extracted);

        let matchedTxn = null;
        let matchMethod = '';
        let confidence = 0;

        const cleanTxnId = extracted.transaction_id ? String(extracted.transaction_id).trim() : '';

        // 1. Strict Amount Verification against Slip
        let amountMatchFailed = false;
        let dateMatchFailed = false;

        const targetAmount = parseFloat(payment.amount);
        if (extracted.amount && Math.abs(parseFloat(extracted.amount) - targetAmount) > 0.1) {
             matchMethod = `Slip Amount Mismatch (Slip: ${extracted.amount}, Expected: ${targetAmount})`;
             confidence = 0.3;
             amountMatchFailed = true;
        }

        // 2. Search statement by Transaction ID first
        if (!amountMatchFailed && cleanTxnId && cleanTxnId.length >= 3) {
            const strippedTxnId = cleanTxnId.replace(/^0+/, '');
            const searchTarget = strippedTxnId.length >= 4 ? strippedTxnId : cleanTxnId;

            let txnWhere = {
                isMatched: false,
                amount: { gte: targetAmount - 0.01, lte: targetAmount + 0.01 }, // EXACT MATCH ONLY
                description: { contains: searchTarget }
            };
            if (statementMonth) {
                txnWhere.statementMonth = statementMonth;
            }
            let possibleTxns = await prisma.bankTransaction.findMany({
                where: txnWhere
            });
            
            if (possibleTxns.length > 0) {
                if (extracted.date) {
                    const slipDate = new Date(extracted.date);
                    if (!isNaN(slipDate.getTime())) {
                        possibleTxns.sort((a, b) => Math.abs(new Date(a.txnDate) - slipDate) - Math.abs(new Date(b.txnDate) - slipDate));
                    }
                    matchedTxn = possibleTxns[0];
                    const txnDate = new Date(matchedTxn.txnDate);
                    // Check if dates are more than 3 days apart
                    const diffTime = Math.abs(txnDate - slipDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > 3) {
                        dateMatchFailed = true;
                        matchedTxn = null; // Reject the match
                        matchMethod = `Date Mismatch (Ref Matched, but Slip Date: ${extracted.date} != Bank Date: ${txnDate.toISOString().split('T')[0]})`;
                    } else {
                        matchMethod = 'Exact Ref ID, Date & Amount Match';
                        confidence = 0.98;
                    }
                } else {
                    matchedTxn = possibleTxns[0];
                    matchMethod = 'Exact Ref ID & Amount Match';
                    confidence = 0.98;
                }
            } else {
                matchMethod = `Ref Num (${cleanTxnId}) found in Slip, but no exact Bank match for Amount: ${targetAmount}`;
            }
        }

        // 3. Search statement by Date and Amount if not matched by ID
        if (!amountMatchFailed && !dateMatchFailed && !matchedTxn && extracted.date) {
            const slipDate = new Date(extracted.date);
            if (!isNaN(slipDate.getTime())) {
                const startDate = new Date(slipDate);
                startDate.setDate(startDate.getDate() - 1);
                const endDate = new Date(slipDate);
                endDate.setDate(endDate.getDate() + 2);

                let txnWhere = {
                    isMatched: false,
                    amount: { gte: targetAmount - 0.01, lte: targetAmount + 0.01 }, // EXACT MATCH ONLY
                    txnDate: {
                        gte: startDate,
                        lte: endDate
                    }
                };
                if (statementMonth) {
                    txnWhere.statementMonth = statementMonth;
                }
                
                const possibleTxns = await prisma.bankTransaction.findMany({
                    where: txnWhere
                });

                if (possibleTxns.length === 1) {
                    matchedTxn = possibleTxns[0];
                    matchMethod = 'Exact Amount and Date Window Match';
                    confidence = 0.85;
                } else if (possibleTxns.length > 1) {
                    matchMethod = 'Multiple Exact Amount/Date Matches (Ambiguous)';
                    confidence = 0.50;
                }
            }
        }

        if (matchedTxn && confidence >= 0.80) {
            await prisma.$transaction([
                prisma.payment.update({
                    where: { id: payment.id },
                    data: { 
                        status: 1, 
                        aiVerified: true, 
                        aiConfidence: confidence,
                        remark: payment.remark ? `${payment.remark} | AI Verified: ${matchMethod} (${cleanTxnId})` : `AI Verified: ${matchMethod} (${cleanTxnId})`
                    }
                }),
                prisma.bankTransaction.update({
                    where: { id: matchedTxn.id },
                    data: { isMatched: true, paymentId: payment.id }
                })
            ]);

            try {
                const { syncLeadEnrollment } = require('./paymentController');
                await syncLeadEnrollment(payment.studentId, payment.payment_type, payment);
            } catch (e) {
                console.error("Lead sync failed on AI verification:", e);
            }

            return res.status(200).json({
                success: true,
                status: 'VERIFIED',
                confidence,
                matchMethod,
                matchedTxnId: matchedTxn.id,
                extracted,
                transaction: matchedTxn
            });
        } else {
            const skipReason = `AI Skipped: ${matchMethod || 'No matching bank transaction found for extracted details.'}`;
            const newRemark = payment.remark ? `${payment.remark} | ${skipReason}` : skipReason;
            await prisma.payment.update({
                where: { id: payment.id },
                data: { 
                    aiVerified: false, 
                    aiConfidence: confidence || 0.1,
                    remark: newRemark
                }
            });
            
            return res.status(200).json({
                success: false,
                status: 'PENDING_MANUAL',
                confidence: confidence || 0.1,
                matchMethod: matchMethod || 'No Match Found',
                extracted,
                remark: newRemark
            });
        }
    } catch (error) {
        console.error("[verifySinglePayment] Error:", error);
        res.status(500).json({ error: "AI Verification process encountered an internal error." });
    }
};

// Legacy process handler mapping
exports.processAIVerification = async (req, res) => {
    try {
        const { paymentIds, statementMonth } = req.body;
        
        if (paymentIds && paymentIds.length === 1) {
            // Forward single verification requests to our new specialized verifySinglePayment controller internally
            req.body.paymentId = paymentIds[0];
            return exports.verifySinglePayment(req, res);
        }
        
        // Multi-slip verify fallback using exact amount matching
        const apiKey = await getGeminiKey();
        if (!apiKey) {
            return res.status(400).json({ error: "Gemini Key missing" });
        }

        let whereClause = { status: 0, aiVerified: false, slip_image: { not: null } };
        if (paymentIds && paymentIds.length > 0) {
            whereClause.id = { in: paymentIds };
        }

        const pendingPayments = await prisma.payment.findMany({ where: whereClause });
        if (pendingPayments.length === 0) {
            return res.status(200).json({ processed: 0, results: [] });
        }

        const results = [];
        let txnWhere = { isMatched: false };
        if (statementMonth) {
            txnWhere.statementMonth = statementMonth;
        }

        const availableBankTxns = await prisma.bankTransaction.findMany({ where: txnWhere });

        for (const payment of pendingPayments) {
            let matchedTxn = null;
            let confidence = 0;
            const exactAmountMatches = availableBankTxns.filter(t => t.amount === payment.amount && !t.isMatched);
            
            if (exactAmountMatches.length === 1) {
                matchedTxn = exactAmountMatches[0];
                confidence = 0.95;
            } else if (exactAmountMatches.length > 1) {
                confidence = 0.50; 
            } else {
                confidence = 0.10;
            }

            if (matchedTxn && confidence > 0.90) {
                await prisma.$transaction([
                    prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: 1, aiVerified: true, aiConfidence: confidence }
                    }),
                    prisma.bankTransaction.update({
                        where: { id: matchedTxn.id },
                        data: { isMatched: true, paymentId: payment.id }
                    })
                ]);

                try {
                    const { syncLeadEnrollment } = require('./paymentController');
                    await syncLeadEnrollment(payment.studentId, payment.payment_type, payment);
                } catch (e) { console.error("Lead sync failed:", e); }

                results.push({ paymentId: payment.id, status: 'VERIFIED', confidence, txnId: matchedTxn.id });
                const index = availableBankTxns.findIndex(t => t.id === matchedTxn.id);
                if(index > -1) availableBankTxns.splice(index, 1);
            } else {
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { aiVerified: false, aiConfidence: confidence }
                });
                results.push({ paymentId: payment.id, status: 'PENDING_MANUAL', confidence });
            }
        }

        res.status(200).json({ processed: pendingPayments.length, results });
    } catch (error) {
        console.error("[processAIVerification] Error:", error);
        res.status(500).json({ error: "AI Verification failed" });
    }
};


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

