const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phones = ['94766231613', '94769276734', '94772087038'];
    const leads = await prisma.lead.findMany({
        where: { phone: { in: phones } },
        include: { roundProgress: true }
    });
    
    console.log(JSON.stringify(leads, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
