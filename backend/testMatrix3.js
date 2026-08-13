const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const axios = require('axios');
    const res = await axios.get('http://localhost:5000/api/admin/data-export/finance-matrix?batchId=5&businessId=2', {
        headers: { 'Authorization': 'Bearer test' },
        validateStatus: () => true
    });
    console.log(res.status);
    console.log(res.data);
}
test();
