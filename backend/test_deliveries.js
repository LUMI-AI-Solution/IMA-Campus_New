const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pending = await prisma.delivery.findMany({
        where: { status: { in: ['Pending', 'Hold'] } },
        include: { items: true, payment: { include: { student: true } } }
    });
    console.log(JSON.stringify(pending.slice(0, 5), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
