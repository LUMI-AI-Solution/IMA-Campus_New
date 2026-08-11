const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');

async function testGeminiSA() {
    try {
        const saPath = path.join(__dirname, 'gemini-service-account.json');
        
        const auth = new GoogleAuth({
            keyFile: saPath,
            scopes: ['https://www.googleapis.com/auth/generative-language']
        });
        
        const client = await auth.getClient();
        const tokenInfo = await client.getAccessToken();
        const token = tokenInfo.token;
        
        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        
        const res = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const models = res.data.models.map(m => m.name);
        console.log("Available Models:", models);
    } catch(err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

testGeminiSA();
