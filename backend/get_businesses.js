const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const businesses = await prisma.business.findMany();
    console.table(businesses.map(b => ({ id: b.id, name: b.name })));
}
main().finally(() => prisma.$disconnect());
