const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');

async function testGeminiSA() {
    try {
        const saPath = path.join(__dirname, 'gemini-service-account.json');
        console.log("Using SA:", saPath);
        
        const auth = new GoogleAuth({
            keyFile: saPath,
            scopes: ['https://www.googleapis.com/auth/generative-language']
        });
        
        const client = await auth.getClient();
        const tokenInfo = await client.getAccessToken();
        const token = tokenInfo.token;
        console.log("Got token! Length:", token.length);
        
        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
        
        const res = await axios.post(apiUrl, {
            contents: [
                { role: "user", parts: [ { text: "Hello! What model are you?" } ] }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("Response:", res.data.candidates[0].content.parts[0].text);
    } catch(err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

testGeminiSA();
