const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const sId = 1;
    const payments = await prisma.payment.findMany({ where: { studentId: sId } });
    payments.forEach(p => console.log(`ID: ${p.id}, Status: ${p.status}, Method: ${p.method}`));
}
run().catch(console.error).finally(() => prisma.$disconnect());
