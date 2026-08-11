const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batches = await prisma.batch.findMany({
        where: { businessId: 1 }
    });
    console.log("Batches for Business 1:", batches.map(b => ({id: b.id, name: b.name})));
}

main().catch(console.error).finally(() => prisma.$disconnect());
