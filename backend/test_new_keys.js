const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testKeys() {
    const keys = [
        'AQ.Ab8RN6Kd73NOPHDa_9sw95jNKcxx-i1gtYSXxhTDH5YOV-Ry4w',
        'AQ.Ab8RN6LIBx9EwhC4pUROdIfxwQF5iywjmvjcxVUgW4R7HSC7mA'
    ];

    for (const key of keys) {
        console.log(`Testing key: ${key.substring(0, 10)}...`);
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            await model.generateContent('hello');
            console.log('Success!');
        } catch(e) {
            console.error('Error:', e.message);
        }
    }
}
testKeys();
