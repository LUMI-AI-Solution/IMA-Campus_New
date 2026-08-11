const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function test() {
    const user = await prisma.user.findFirst();
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'IMA_SECURE_SECRET_KEY_2026');
    try {
        const res = await axios.get('http://127.0.0.1:5000/api/ai-verification/transactions?statementMonth=July', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Response rows count:", res.data.rows.length);
        console.log("Unique sheet names in rows:", [...new Set(res.data.rows.map(r => r._sheetName))]);
    } catch(e) {
        console.error("Error:", e.message);
    }
}
test();
