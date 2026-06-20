const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const p = await prisma.payment.findUnique({
        where: { id: 447 },
        select: { id: true, status: true, valid_until: true }
    });
    console.log("P447:", p);
}
check().catch(console.error).finally(() => prisma.$disconnect());
