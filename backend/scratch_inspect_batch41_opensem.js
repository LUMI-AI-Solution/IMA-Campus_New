const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectBatch41OpenSem() {
    const leads = await prisma.lead.findMany({
        where: {
            batchId: 41,
            campaignType: 'AFTER_SEMINAR',
            inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
            assignedTo: null
        },
        select: {
            id: true,
            name: true,
            phone: true,
            inquiryType: true,
            assignedTo: true,
            unreadCount: true,
            lastMessage: true,
            createdAt: true
        }
    });

    console.log(`Found ${leads.length} unassigned leads in Batch 41 under OPEN_SEMINAR/NORMAL:`);
    console.log(leads);
}

inspectBatch41OpenSem().catch(console.error).finally(() => prisma.$disconnect());
