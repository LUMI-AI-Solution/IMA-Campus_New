const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkPayment() {
    const p = await prisma.payment.findFirst({
        where: { studentId: 1819 },
        orderBy: { id: 'desc' }
    });
    console.log(p);
}
checkPayment().finally(() => process.exit(0));
