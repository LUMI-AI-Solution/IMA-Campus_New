const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const lead = await prisma.lead.findUnique({ where: { id: 18820 } });
    console.log(`Created: ${lead.createdAt}`);
}
main().finally(() => prisma.$disconnect());
