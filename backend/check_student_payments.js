const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const studentId = 951; // From the upgrade log
    const payments = await prisma.payment.findMany({
        where: { studentId: studentId },
        orderBy: { id: 'desc' }
    });
    console.log(payments.map(p => ({ id: p.id, amount: p.amount, status: p.status, method: p.method, remark: p.remark })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
