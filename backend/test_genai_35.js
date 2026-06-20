const { GoogleGenAI } = require('@google/genai');

async function testKeys() {
    const keys = [
        'AQ.Ab8RN6Kd73NOPHDa_9sw95jNKcxx-i1gtYSXxhTDH5YOV-Ry4w',
        'AQ.Ab8RN6LIBx9EwhC4pUROdIfxwQF5iywjmvjcxVUgW4R7HSC7mA'
    ];

    for (const key of keys) {
        console.log(`Testing key: ${key.substring(0, 10)}...`);
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: 'hello',
            });
            console.log('Success!', response.text);
        } catch(e) {
            console.error('Error:', e.message);
        }
    }
}
testKeys();
