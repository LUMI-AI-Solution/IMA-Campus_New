const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { 
            OR: [
                { phone: { startsWith: '94707458410' } },
                { phone: { startsWith: '94776673959' } }
            ]
        }
    });
    console.log(leads);
}
main().finally(() => prisma.$disconnect());
