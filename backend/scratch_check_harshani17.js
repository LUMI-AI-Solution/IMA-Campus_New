const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 49, batchId: 26, campaignType: 'FREE_SEMINAR' },
        take: 5
    });
    console.log("Sample of the 517 leads:");
    leads.forEach(l => {
        console.log(`Lead ${l.id} - phone: ${l.phone}, assignedAt: ${l.assignedAt}, createdAt: ${l.createdAt}, source: ${l.source}, isAutoAssigned: ${l.isAutoAssigned}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
