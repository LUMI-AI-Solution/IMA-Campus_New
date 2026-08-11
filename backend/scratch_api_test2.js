const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const p = await prisma.payment.findFirst({ orderBy: { id: 'desc' }});
    console.log("Last payment:", p);
}
test().finally(() => prisma.$disconnect());
