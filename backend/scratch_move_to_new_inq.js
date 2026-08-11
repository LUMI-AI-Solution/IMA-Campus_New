const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function moveOpenSemToNewInq() {
    // 1. Update all unassigned leads in batch 41 to NEW_INQ
    const res1 = await prisma.lead.updateMany({
        where: {
            batchId: 41,
            campaignType: 'AFTER_SEMINAR',
            inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
            assignedTo: null
        },
        data: {
            inquiryType: 'NEW_INQ',
            newInqTimestamp: new Date()
        }
    });
    console.log(`Moved ${res1.count} unassigned leads in Batch 41 to NEW_INQ.`);

    // 2. Check counts for Batch 41 unassigned
    const [openSemUnassigned, newInqUnassigned, totalUnassigned] = await Promise.all([
        prisma.lead.count({ where: { batchId: 41, campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR', assignedTo: null } }),
        prisma.lead.count({ where: { batchId: 41, campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ', assignedTo: null } }),
        prisma.lead.count({ where: { batchId: 41, campaignType: 'AFTER_SEMINAR', assignedTo: null } })
    ]);

    console.log(`Batch 41 Unassigned Stats:`);
    console.log(`- Open Sem: ${openSemUnassigned}`);
    console.log(`- New Inq: ${newInqUnassigned}`);
    console.log(`- Total: ${totalUnassigned}`);
}

moveOpenSemToNewInq().catch(console.error).finally(() => prisma.$disconnect());
