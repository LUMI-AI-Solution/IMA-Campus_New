const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const lead = await prisma.lead.findFirst({
        where: { phone: { contains: '769276734' } }
    });
    console.log("Lead details:", lead);
}

main().catch(console.error).finally(() => prisma.$disconnect());
