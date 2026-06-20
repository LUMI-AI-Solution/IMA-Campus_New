const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const l = await prisma.lead.findUnique({ where: { id: 27114 } });
    console.log("Lead batchId:", l.batchId);
}
main().catch(console.error).finally(() => prisma.$disconnect());
