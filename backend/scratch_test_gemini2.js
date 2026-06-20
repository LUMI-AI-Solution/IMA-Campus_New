const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

async function test() {
    const genAI = new GoogleGenerativeAI('AIzaSyB6ONeTbMOT2SGk5w36BQlMIoDsWLBDbZM');
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const filePath = '/root/IMA-Campus/backend/storage/documents/1781709738827_951974055.jpg';
    
    const prompt = `
You are an expert AI bank slip reader for the bank "BOC".
Analyze the slip.
Extract:
- transaction_id: (The unique bank transaction reference number, ID, or reference code. Return null if unreadable)
- amount: (The transfer amount as a decimal number, e.g. 5000.00, without commas)
- date: (The exact transaction date from the slip, converted to YYYY-MM-DD format. Return null if unreadable. NEVER guess the date)

Provide output ONLY as valid JSON.
`;
    const filePart = {
        inlineData: {
            data: fs.readFileSync(filePath).toString("base64"),
            mimeType: "image/jpeg"
        }
    };
    
    const result = await model.generateContent([prompt, filePart]);
    console.log(result.response.text());
}
test();
