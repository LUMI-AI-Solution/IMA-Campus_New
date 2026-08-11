const { GoogleGenAI } = require('@google/genai');
const path = require('path');
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'gemini-service-account.json');

async function test() {
    try {
        const ai = new GoogleGenAI({});
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: ["What is 2+2?"]
        });
        console.log("Success:", response.text);
    } catch(err) {
        console.log("Error:", err.message);
    }
}
test();
