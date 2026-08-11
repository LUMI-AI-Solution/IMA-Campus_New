const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batches = await prisma.batch.findMany({
        where: { id: { in: [14, 26] } }
    });
    console.log(batches);
}
main().catch(console.error).finally(() => prisma.$disconnect());
