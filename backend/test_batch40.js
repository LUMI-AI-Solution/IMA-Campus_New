const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batch40 = await prisma.batch.findUnique({
        where: { id: 40 }
    });
    console.log(batch40);
}
main().catch(console.error).finally(() => prisma.$disconnect());
