const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const p = await prisma.payment.findUnique({
        where: { id: 1970 },
        include: { auditLogs: true }
    });
    console.log(JSON.stringify(p, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
