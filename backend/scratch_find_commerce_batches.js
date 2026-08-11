const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCommerceBatches() {
    const batches = await prisma.batch.findMany({
        where: { businessId: 6 }
    });
    console.log("Batches for Business 6:");
    batches.forEach(b => console.log(`ID: ${b.id}, Name: ${b.name}`));
}

findCommerceBatches().catch(e => console.error(e)).finally(() => prisma.$disconnect());
