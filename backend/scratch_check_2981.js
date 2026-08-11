const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const p = await prisma.payment.findUnique({ where: { id: 2981 } });
    console.log(JSON.stringify(p, null, 2));
}
test().finally(() => prisma.$disconnect());
