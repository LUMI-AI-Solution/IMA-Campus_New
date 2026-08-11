const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rejected = await prisma.payment.findMany({
        where: { status: 2 },
        orderBy: { id: 'desc' },
        take: 3
    });
    console.log(rejected);
}
main().catch(console.error).finally(() => prisma.$disconnect());
