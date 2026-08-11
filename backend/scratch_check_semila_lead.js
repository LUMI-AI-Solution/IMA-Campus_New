const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '750926887' } },
        include: { batch: true }
    });
    console.log("CRM LEADS:", JSON.stringify(leads, null, 2));
}

main().finally(() => prisma.$disconnect());
