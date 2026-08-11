const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertBatch41NormalLeads() {
    // Revert unassigned leads in batch 41 that were set to NEW_INQ back to NORMAL
    const updated = await prisma.lead.updateMany({
        where: {
            batchId: 41,
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'NEW_INQ',
            assignedTo: null
        },
        data: {
            inquiryType: 'NORMAL'
        }
    });

    console.log(`Reverted ${updated.count} unassigned leads in Batch 41 back to NORMAL.`);
}

revertBatch41NormalLeads().catch(console.error).finally(() => prisma.$disconnect());
