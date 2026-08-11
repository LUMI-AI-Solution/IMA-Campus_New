const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function test() {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });

        console.log("student id:", student.id);
        const loginRes = await axios.post('http://localhost:5000/api/admin/ghost-login', { studentId: student.id });
        console.log("Login res keys:", Object.keys(loginRes.data));
        const token = loginRes.data.token;
        console.log("Token:", token);
    } catch (err) {
        console.error(err.message);
    }
}
test();
