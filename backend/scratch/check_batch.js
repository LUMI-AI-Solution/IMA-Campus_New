const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batch = await prisma.batch.findUnique({
        where: { id: 12 }
    });
    console.log("Batch 12:", batch);
}

main().finally(() => prisma.$disconnect());
