const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const payments = await prisma.payment.findMany({
        where: { studentId: 2852 }
    });
    console.log("Payments for 2852:", payments.length);
    payments.forEach(p => console.log(p.id, p.status, p.amount));
}
main().catch(console.error).finally(() => prisma.$disconnect());
