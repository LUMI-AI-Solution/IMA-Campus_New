const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR' },
        _count: { id: true }
    });
    console.log("AFTER_SEMINAR, OPEN_SEMINAR in Batch 26:", leads);

    const leads2 = await prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'NORMAL' },
        _count: { id: true }
    });
    console.log("AFTER_SEMINAR, NORMAL in Batch 26:", leads2);
}
main().catch(console.error).finally(() => prisma.$disconnect());
