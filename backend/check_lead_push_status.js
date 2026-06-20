const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const lead = await prisma.lead.findFirst({
        where: { phone: { contains: '94710794597_BIZ_1' } }
    });
    console.log(lead);
}
main().finally(() => prisma.$disconnect());
