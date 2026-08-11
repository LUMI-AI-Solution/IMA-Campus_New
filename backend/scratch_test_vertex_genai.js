const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const authPath = path.join(__dirname, 'gemini-service-account.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = authPath;

async function run() {
    try {
        const ai = new GoogleGenAI({ vertexai: { project: 'ima-campus', location: 'us-central1' } });
        console.log("AI initialized");
    } catch(e) {
        console.log(e);
    }
}
run();
