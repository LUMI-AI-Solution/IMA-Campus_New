const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batch = await prisma.batch.findUnique({
        where: { id: 40 }
    });
    console.log(batch);
}
main().catch(console.error).finally(() => prisma.$disconnect());
