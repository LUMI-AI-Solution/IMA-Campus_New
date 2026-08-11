const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 308, campaignType: 'FREE_SEMINAR' },
        orderBy: { id: 'desc' },
        take: 5,
        select: { id: true, name: true, isAutoAssigned: true, assignedAt: true }
    });
    console.table(leads);
    await prisma.$disconnect();
}
check();
