const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectUnreadBatch41() {
    const leads = await prisma.lead.findMany({
        where: {
            batchId: 41,
            campaignType: 'AFTER_SEMINAR',
            assignedTo: null,
            unreadCount: { gt: 0 }
        },
        select: {
            id: true,
            name: true,
            phone: true,
            inquiryType: true,
            unreadCount: true,
            lastMessage: true,
            createdAt: true
        }
    });

    console.log(`Unassigned with unread > 0 in Batch 41 (${leads.length}):`, leads);
}

inspectUnreadBatch41().catch(console.error).finally(() => prisma.$disconnect());
