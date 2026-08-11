const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            batchId: 40,
            campaignType: "OPEN_SEMINAR"
        },
        take: 10
    });
    console.log(JSON.stringify(leads, null, 2));

    const groupedStatus = await prisma.lead.groupBy({
        by: ['enrollmentStatus', 'status', 'openSemCallStatus'],
        where: {
            batchId: 40,
            campaignType: "OPEN_SEMINAR"
        },
        _count: {
            id: true
        }
    });
    console.log(JSON.stringify(groupedStatus, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
