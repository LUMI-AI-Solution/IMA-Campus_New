const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findChathurika() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { firstName: { contains: 'Chathu' } },
                { lastName: { contains: 'Madushani' } }
            ]
        },
        select: { id: true, firstName: true, lastName: true, role: true }
    });
    console.log("Users:", users);

    for (const u of users) {
        const total = await prisma.lead.count({ where: { assignedTo: u.id, campaignType: 'AFTER_SEMINAR' } });
        const unread = await prisma.lead.count({ where: { assignedTo: u.id, campaignType: 'AFTER_SEMINAR', unreadCount: { gt: 0 } } });
        console.log(`User ${u.id} (${u.firstName} ${u.lastName}) => Total: ${total}, Unread: ${unread}`);
    }
}

findChathurika().catch(console.error).finally(() => prisma.$disconnect());
