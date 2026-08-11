const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({ where: { phone: { contains: '94781240564' } } });
    console.log(leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
