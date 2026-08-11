const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batches = await prisma.batch.findMany({
        where: { name: { contains: 'මාස 06න් A/L - Art' } }
    });
    console.log("Batches matching 'මාස 06න් A/L - Art':", batches.map(b => ({id: b.id, name: b.name})));
}

main().catch(console.error).finally(() => prisma.$disconnect());
