const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['campaignType', 'inquiryType'],
        where: { assignedTo: 49, batchId: 26 },
        _count: { id: true }
    });
    console.log("All leads for Harshani in Batch 26 by campaign/inquiry type:");
    console.log(leads);

    const otherBatches = await prisma.lead.groupBy({
        by: ['batchId'],
        where: { assignedTo: 49 },
        _count: { id: true }
    });
    console.log("All batches with leads for Harshani:");
    console.log(otherBatches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
