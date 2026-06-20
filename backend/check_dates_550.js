const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const validPayments = await prisma.payment.findMany({
        where: { studentId: 550 },
        select: { id: true, status: true, subjects: true, created_at: true }
    });
    console.log(validPayments);
}
check().catch(console.error).finally(() => prisma.$disconnect());
