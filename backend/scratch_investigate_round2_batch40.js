const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const round2Leads = await prisma.lead.findMany({
        where: {
            batchId: 40,
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'OPEN_SEMINAR',
            coordinationRound: 2
        }
    });

    console.log(JSON.stringify(round2Leads, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
