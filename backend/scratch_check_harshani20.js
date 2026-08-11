const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batchDist = await prisma.lead.groupBy({
        by: ['batchId'],
        where: { assignedTo: 49, campaignType: 'AFTER_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } },
        _count: { id: true }
    });
    console.log("Batch distribution for the 229 leads:", batchDist);
}

main().catch(console.error).finally(() => prisma.$disconnect());
