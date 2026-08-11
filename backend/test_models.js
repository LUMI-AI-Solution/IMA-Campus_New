const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const setting = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
        if (!setting || !setting.value) {
            console.log("No API key in DB");
            return;
        }
        const keys = setting.value.split(',').map(k => k.trim()).filter(k => k);
        const key = keys[0];
        
        const ai = new GoogleGenAI({ apiKey: key });
        const modelsToTest = [
            'gemini-flash-latest', 
            'gemini-flash-lite-latest',
            'gemini-2.5-flash',
            'gemini-3.5-flash',
            'gemini-2.0-flash-lite-001'
        ];
        
        for (const modelName of modelsToTest) {
            try {
                console.log(`Testing ${modelName}...`);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: ["Hello"]
                });
                console.log(`SUCCESS: ${modelName}`);
                break; // If one succeeds, we are good
            } catch (err) {
                console.log(`FAILED: ${modelName} -> ${err.message}`);
            }
        }
    } catch(e) {
        console.error("Test script failed:", e.message);
    }
}
run();
