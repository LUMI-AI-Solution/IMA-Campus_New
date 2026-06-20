const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const p443 = await prisma.payment.findUnique({
        where: { id: 443 },
        select: { id: true, status: true, due_date: true, method: true, payment_type: true }
    });
    console.log("P443:", p443);
}
check().catch(console.error).finally(() => prisma.$disconnect());
