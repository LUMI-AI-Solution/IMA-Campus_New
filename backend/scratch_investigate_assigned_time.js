const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR', assignedTo: { not: null } },
        select: { assignedTo: true, assignedAt: true },
        orderBy: { assignedAt: 'asc' }
    });

    const userMap = {};
    const users = await prisma.user.findMany({ select: { id: true, firstName: true } });
    users.forEach(u => userMap[u.id] = u.firstName);

    console.log("=== ASSIGNMENT TIMELINE ===");
    let currentAssignee = null;
    let count = 0;
    let lastTime = null;

    for (const lead of leads) {
        if (lead.assignedTo !== currentAssignee) {
            if (currentAssignee !== null) {
                console.log(`Assigned ${count} leads to ${userMap[currentAssignee]} around ${lastTime}`);
            }
            currentAssignee = lead.assignedTo;
            count = 1;
        } else {
            count++;
        }
        lastTime = lead.assignedAt;
    }
    if (currentAssignee !== null) {
        console.log(`Assigned ${count} leads to ${userMap[currentAssignee]} around ${lastTime}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
