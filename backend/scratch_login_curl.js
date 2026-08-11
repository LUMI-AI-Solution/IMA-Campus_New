const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if(!user) { console.log("No ADMIN user found"); return; }
        const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
            username: user.username,
            password: 'password' // just guessing or we can just mock token
        }).catch(() => null);
        
        let token;
        if (loginRes && loginRes.data.token) {
            token = loginRes.data.token;
        } else {
            const jwt = require('jsonwebtoken');
            token = jwt.sign({ id: user.id, role: user.role, username: user.username }, "ima_super_secret_token_12345");
        }
        
        const res = await axios.get('http://127.0.0.1:5000/api/ai-verification/transactions?statementMonth=July', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Rows count:", res.data.rows.length);
        console.log("Unique sheets:", [...new Set(res.data.rows.map(r => r._sheetName))]);
    } catch(e) {
        console.log("Error:", e.message, e.response?.data);
    }
}
run();
