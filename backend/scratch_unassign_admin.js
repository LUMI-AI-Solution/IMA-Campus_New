const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unassign() {
    const res = await prisma.lead.updateMany({
        where: { assignedTo: 308, campaignType: 'FREE_SEMINAR' },
        data: { assignedTo: null, status: 'NEW', callStatus: 'pending' }
    });
    console.log("Unassigned leads from Super Admin:", res.count);
    await prisma.$disconnect();
}
unassign();
