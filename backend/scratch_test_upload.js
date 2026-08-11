const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        const formData = new FormData();
        formData.append('paymentId', '999999'); // fake ID
        formData.append('remark', 'test remark');
        
        // Create a dummy file
        const dummyFile = path.join(__dirname, 'dummy.jpg');
        fs.writeFileSync(dummyFile, 'dummy content');
        
        formData.append('slipImages', fs.createReadStream(dummyFile));

        // Get an admin token for testing (so it bypasses)
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const jwt = require('jsonwebtoken');
        
        const admin = await prisma.user.findFirst({ where: { role: 'SYSTEM_ADMIN' } });
        const token = jwt.sign(
            { id: admin.id, role: admin.role, userId: admin.id },
            process.env.JWT_SECRET || 'ima_jwt_sec_7d160fdbbfc131f568e69501f98cb67223270989b3051b802012b45efbf9f65e_2026',
            { expiresIn: '1h' }
        );

        console.log("Sending request...");
        const response = await axios.post('http://localhost:5000/api/student/upload-due-slip', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log("Success:", response.data);
    } catch (error) {
        console.error("Error Status:", error.response?.status);
        console.error("Error Data:", error.response?.data);
        console.error("Error Message:", error.message);
    }
}

testUpload();
