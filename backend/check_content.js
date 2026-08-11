const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const contents = await prisma.content.findMany({
        take: 5,
        orderBy: { id: 'desc' }
    });
    console.log(contents.map(c => c.contentType));
}
main().catch(console.error).finally(() => prisma.$disconnect());
