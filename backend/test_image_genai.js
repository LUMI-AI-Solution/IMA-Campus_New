const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

async function testImage() {
    const ai = new GoogleGenAI({ apiKey: 'AQ.Ab8RN6Kd73NOPHDa_9sw95jNKcxx-i1gtYSXxhTDH5YOV-Ry4w' });
    const files = fs.readdirSync('/root/IMA-Campus/storage/documents').filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
    if(files.length === 0) return console.log("No images");
    const filePath = '/root/IMA-Campus/storage/documents/' + files[0];
    const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    const filePart = {
        inlineData: {
            data: fs.readFileSync(filePath).toString("base64"),
            mimeType: mimeType
        }
    };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: ["What is this image?", filePart]
        });
        console.log("Success:", response.text);
    } catch(e) {
        console.error("Error:", e.message);
    }
}
testImage();
