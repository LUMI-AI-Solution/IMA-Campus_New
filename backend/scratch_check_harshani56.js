const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.groupBy({
        by: ['inquiryType'],
        where: { assignedTo: 49, batchId: 26, campaignType: 'AFTER_SEMINAR' },
        _count: { id: true }
    });
    console.log("AFTER_SEMINAR leads for Harshani in Batch 26:");
    console.log(counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
