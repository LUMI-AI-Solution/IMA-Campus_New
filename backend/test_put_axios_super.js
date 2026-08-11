const axios = require('axios');
const FormData = require('form-data');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst();
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: admin.id, role: admin.role, businessId: admin.businessId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

    const fd = new FormData();
    fd.append('stepOrder', '1');
    fd.append('message', 'Test message from axios');

    const res = await axios.put('http://localhost:5000/api/admin/crm/auto-reply/67', fd, {
      headers: {
        ...fd.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log("SUCCESS:", res.data);
  } catch (e) {
    console.log("ERROR:", e.response?.data || e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
