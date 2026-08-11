const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const p = await prisma.payment.findMany({ 
        where: { remark: { contains: 'No Google Sheet Linked' } },
        orderBy: { id: 'desc' },
        take: 3
    });
    console.log(JSON.stringify(p, null, 2));
}
test().finally(() => prisma.$disconnect());
