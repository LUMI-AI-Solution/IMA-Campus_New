const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFilterCounts() {
    // Find staff Chathurika
    const staff = await prisma.user.findFirst({
        where: { firstName: { contains: 'Chathurika' } }
    });

    console.log("Staff Chathurika:", staff?.id, staff?.firstName, staff?.lastName);

    if (staff) {
        const whereClause = {
            campaignType: 'AFTER_SEMINAR',
            batch: { businessId: 9 },
            assignedTo: staff.id
        };

        const [totalMatching, totalUnreadMatching] = await Promise.all([
            prisma.lead.count({ where: whereClause }),
            prisma.lead.count({ where: { ...whereClause, unreadCount: { gt: 0 } } })
        ]);

        console.log(`When filtered by Chathurika:`);
        console.log(`- totalMatching (Total Leads): ${totalMatching}`);
        console.log(`- totalUnreadMatching (True Database Unreads): ${totalUnreadMatching}`);
    }
}

testFilterCounts().catch(console.error).finally(() => prisma.$disconnect());
