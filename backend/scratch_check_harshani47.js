const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR' },
        _count: { id: true }
    });
    console.log("OPEN_SEMINAR leads per user in Batch 26:");
    console.log(counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
