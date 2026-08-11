require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    // find a student
    const student = await prisma.user.findFirst({ where: { role: 'student' } });
    console.log("Student ID:", student.id);
    
    // We can just call the endpoint using axios with a generated token or mock it
}
test().catch(console.error).finally(() => prisma.$disconnect());
