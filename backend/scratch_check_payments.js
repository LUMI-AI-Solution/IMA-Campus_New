const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const payments = await prisma.payment.findMany({
        where: { amount: { in: [103000, 10500] } },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: { id: true, studentId: true, amount: true, status: true, aiVerified: true, remark: true, created_at: true }
    });
    console.log(payments);
}
main().catch(console.error).finally(() => prisma.$disconnect());
