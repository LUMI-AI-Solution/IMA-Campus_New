const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['campaignType', 'inquiryType', 'source'],
        where: { assignedTo: 49, batchId: 26 },
        _count: { id: true }
    });
    console.log("All leads for Harshani in Batch 26:", leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
