const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const sId = 1;
    const payments = await prisma.payment.findMany({ where: { studentId: sId } });
    console.log(`Student ${sId} total payments in DB: ${payments.length}`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
