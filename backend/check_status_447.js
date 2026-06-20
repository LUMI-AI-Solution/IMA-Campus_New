const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const p447 = await prisma.payment.findUnique({
        where: { id: 447 },
        select: { id: true, status: true }
    });
    console.log("Current P447:", p447);
}
check().catch(console.error).finally(() => prisma.$disconnect());
