const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function main() {
  try {
    const fd = new FormData();
    fd.append('stepOrder', '1');
    fd.append('message', 'Test message from put request');
    fd.append('businessId', '13');
    fd.append('campaignType', 'AFTER_SEMINAR');
    
    // We need an admin token
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) throw new Error("No admin found");
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: admin.id, role: admin.role, businessId: admin.businessId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

    const res = await axios.put('http://localhost:5000/api/admin/crm/auto-reply/67', fd, {
      headers: {
        ...fd.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log("Success:", res.data);
    await prisma.$disconnect();
  } catch(e) {
    console.error("Error:", e.response?.data || e.message);
  }
}
main();
