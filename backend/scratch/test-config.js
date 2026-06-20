const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    // get an admin token first
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) return console.log('no admin');
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET || 'secret');
    
    try {
        const res = await axios.get('http://localhost:5000/api/ai-verification/config', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("API Response:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("API Error:", e.response ? e.response.data : e.message);
    }
}
test();
