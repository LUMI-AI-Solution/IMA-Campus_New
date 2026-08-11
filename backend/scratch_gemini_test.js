const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGemini() {
    const filePathLocal = path.join(process.cwd(), 'storage/documents', '1783609519021_426087872.jpg');
    if (!fs.existsSync(filePathLocal)) {
        console.log("File not found");
        return;
    }

    const mimeType = 'image/jpeg';
    const filePart = {
        inlineData: {
            data: fs.readFileSync(filePathLocal).toString("base64"),
            mimeType
        }
    };

    const prompt = `
You are an expert AI bank slip reader.
We have the following bank templates configured: BOC (CDM, Flex Online Transfer); Sampath (Sampath Online transfer); Commercial (Commercial (CDM Slip)); HNB (HNB to Commbercial Fund Transfer)
First, carefully analyze the slip and identify the bank and the SINGLE matching slip template from the list above.
Then, extract:
- matched_bank: The identified bank name exactly as listed.
- matched_slip_type: A SINGLE slip template name from the list (e.g. "CDM"). Do not output the whole list.
- transaction_id: (CRITICAL: For BOC: Look for 'DEPOSITOR RELATED REFERENCE' at the bottom of the slip and extract that exact number. Do NOT extract the TO account number. If 'DEPOSITOR RELATED REFERENCE' is not found, extract the RECORD NO. For BOC Online Transfer: Look for 'Online Banking reference Number' or 'Transaction ID'. For People's Bank: Look for 'Trace No' or 'Reference'. For HNB: Look for 'Receiver Reference' and extract the exact string (e.g. '978252656v - full fee'). Do not extract Transaction Reference for HNB if Receiver Reference exists. For Sampath Online: Look for 'Beneficiary Remarks' and extract it. For other banks, look for REF, Reference, Seq No. IMPORTANT: The extracted ID MUST be at least 4 digits long. DO NOT extract short 2-digit numbers like "07". Return null if unreadable)
- atm_id: (For Sampath Bank: Look for the ATM ID which usually starts with 'A00' e.g. 'A0001931' at the top of the slip. Return null if unreadable)
- remark: (Look for ANY 'Remarks', 'Description', 'Narration', 'Reference', or 'Reason' field and extract it exactly as written. Return null if not found)
- terminal_id: (For Commercial Bank: Look for the CRM branch name at the top of the slip, e.g., 'ANAMADUW-CRM1 BR' or 'KADAWATH-CRM'. Do NOT extract the alphanumeric TERMINAL ID like 'RANAMAD1HT'. Return null if unreadable)
- narration: (For Commercial Bank: Look for NARRATION field. Extract exactly what is written. Return null if unreadable)
- phone_number: (Look for any phone number printed or handwritten on the slip, usually 9 or 10 digits starting with 07. Return null if not found)
- amount: (The transfer amount as a decimal number, e.g. 5000.00, without commas)
- date: (The exact transaction date from the slip, converted to YYYY-MM-DD format. Return null if unreadable. NEVER guess the date)
- extra_data: (An array of ANY other text found on the slip that could be useful for matching, such as names (e.g. 'yesith Methnila'), 4-to-6 digit random numbers, hand-written remarks, or any text not captured above. Exclude boilerplate text like 'Thank you' or 'Bank'. Provide as an array of strings. If none, return empty array [])

Provide output ONLY as valid JSON.
Format:
{
  "matched_bank": "Name",
  "matched_slip_type": "Name",
  "transaction_id": "Extracted Reference Number or null",
  "atm_id": "Extracted ATM ID or null",
  "remark": "Extracted Remark or null",
  "terminal_id": "Extracted Terminal ID or null",
  "narration": "Extracted Narration or null",
  "phone_number": "Extracted phone number or null",
  "amount": 5000.00,
  "date": "YYYY-MM-DD or null",
  "extra_data": ["string1", "string2"]
}
`;

    const saPath = path.join(__dirname, 'gemini-service-account.json');
    const auth = new GoogleAuth({
        keyFile: saPath,
        scopes: ['https://www.googleapis.com/auth/generative-language']
    });
    
    const client = await auth.getClient();
    const tokenInfo = await client.getAccessToken();
    const token = tokenInfo.token;
    
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    const res = await axios.post(apiUrl, {
        contents: [
            { role: "user", parts: [ { text: prompt }, filePart ] }
        ]
    }, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    console.log(res.data.candidates[0].content.parts[0].text);
}

testGemini().catch(console.error).finally(() => prisma.$disconnect());
