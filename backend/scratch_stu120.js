const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
    const studentId = 120;
    const payments = await prisma.payment.findMany({
        where: { studentId: studentId }
    });
    console.log(payments);
}
test().finally(() => prisma.$disconnect());
