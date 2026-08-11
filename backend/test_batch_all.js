const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.lead.findMany({
        where: { batchId: 38, campaignType: 'FREE_SEMINAR' },
        include: { assignedUser: true }
    });

    console.log("Total leads in batch 38:", leads.length);
    const byUser = {};
    leads.forEach(l => {
        const u = l.assignedUser ? l.assignedUser.firstName : 'Unassigned';
        byUser[u] = (byUser[u] || 0) + 1;
    });
    console.log(byUser);
}
run().catch(console.error).finally(() => prisma.$disconnect());
