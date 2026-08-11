const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCounts() {
    const businessId = 9;
    const batchId = 41;

    // Base where
    const baseWhere = {
        campaignType: 'AFTER_SEMINAR',
        batch: { businessId: businessId },
        batchId: batchId
    };

    const trueAllLeadsCount = await prisma.lead.count({ where: baseWhere });
    const trueAllUnreadCount = await prisma.lead.count({ where: { ...baseWhere, unreadCount: { gt: 0 } } });

    console.log("=== ENTIRE BUSINESS / BATCH 41 STATS ===");
    console.log(`True ALL leads: ${trueAllLeadsCount}`);
    console.log(`True ALL unread: ${trueAllUnreadCount}`);

    // Coordinator view (userId = 49)
    const coordWhere = {
        ...baseWhere,
        OR: [
            { assignedTo: null },
            { assignedTo: 49 }
        ]
    };

    const [coordAssigned, coordAssignedUnread, openSemCount, openSemUnread, newInqCount, newInqUnread] = await Promise.all([
        prisma.lead.count({ where: { ...coordWhere, assignedTo: { not: null } } }),
        prisma.lead.count({ where: { ...coordWhere, assignedTo: { not: null }, unreadCount: { gt: 0 } } }),
        prisma.lead.count({ where: { ...coordWhere, assignedTo: 49, inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } } }),
        prisma.lead.count({ where: { ...coordWhere, assignedTo: 49, inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] }, unreadCount: { gt: 0 } } }),
        prisma.lead.count({ where: { ...coordWhere, assignedTo: 49, inquiryType: 'NEW_INQ' } }),
        prisma.lead.count({ where: { ...coordWhere, assignedTo: 49, inquiryType: 'NEW_INQ', unreadCount: { gt: 0 } } }),
    ]);

    console.log("\n=== COORDINATOR SANDINI VIEW ===");
    console.log(`ALL Tab Badge (Total / Unread): ${trueAllLeadsCount} / ${trueAllUnreadCount}`);
    console.log(`Assigned (Total / Unread): ${coordAssigned} / ${coordAssignedUnread}`);
    console.log(`Open Sem (Total / Unread): ${openSemCount} / ${openSemUnread}`);
    console.log(`New Inq (Total / Unread): ${newInqCount} / ${newInqUnread}`);

    // Manager View
    const [mgrOpenSemUnassigned, mgrNewInqUnassigned] = await Promise.all([
        prisma.lead.count({ where: { ...baseWhere, assignedTo: null, inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } } }),
        prisma.lead.count({ where: { ...baseWhere, assignedTo: null, inquiryType: 'NEW_INQ' } })
    ]);

    console.log("\n=== MANAGER VIEW ===");
    console.log(`Unassigned Open Sem: ${mgrOpenSemUnassigned}`);
    console.log(`Unassigned New Inq: ${mgrNewInqUnassigned}`);
}

testCounts().catch(console.error).finally(() => prisma.$disconnect());
