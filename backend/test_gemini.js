const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function test() {
    try {
        const setting = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
        const apiKey = setting ? setting.value : process.env.GEMINI_API_KEY;
        console.log("API Key exists?", !!apiKey);

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Find a random image in storage/documents
        const files = fs.readdirSync('/root/IMA-Campus/storage/documents').filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
        if(files.length === 0) {
           console.log("No images found");
           return;
        }
        const filePath = '/root/IMA-Campus/storage/documents/' + files[0];
        console.log("Testing with file:", filePath);

        const filePart = {
            inlineData: {
                data: fs.readFileSync(filePath).toString("base64"),
                mimeType: "image/jpeg"
            }
        };

        const prompt = "What is this image?";
        const result = await model.generateContent([prompt, filePart]);
        const response = await result.response;
        console.log("Success:", response.text());
    } catch(err) {
        console.error("Gemini Error:", err);
    }
}
test();
