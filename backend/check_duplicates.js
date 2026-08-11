const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '766231613' } },
        include: { roundProgress: true }
    });
    console.log("All leads for 766231613:");
    console.log(JSON.stringify(leads, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
