const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const p = await prisma.payment.findUnique({
        where: { id: 1915 },
        include: { delivery: { include: { items: true } } }
    });
    console.log(JSON.stringify(p, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
