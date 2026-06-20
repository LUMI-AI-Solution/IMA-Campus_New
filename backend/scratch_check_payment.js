const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const payment = await prisma.payment.findUnique({ where: { id: 1760 } });
    console.log("Payment 1760:");
    console.log("aiVerified:", payment.aiVerified);
    console.log("remark:", payment.remark);
}
main().catch(console.error).finally(() => prisma.$disconnect());
