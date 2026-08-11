const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batches = await prisma.batch.findMany({
        where: { name: { contains: 'July' } }
    });
    console.log(batches);
}
main().catch(console.error).finally(() => prisma.$disconnect());
