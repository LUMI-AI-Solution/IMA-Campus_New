const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.lead.groupBy({
        by: ['batchId'],
        where: { 
            campaignType: 'FREE_SEMINAR',
            isCallCenter: true
        },
        _count: {
            id: true
        }
    });

    const batches = await prisma.batch.findMany({
        where: { id: { in: leads.map(l => l.batchId).filter(Boolean) } },
        select: { id: true, name: true, business: { select: { name: true } } }
    });

    console.log("CC Leads per Batch:");
    leads.forEach(l => {
        const batch = batches.find(b => b.id === l.batchId);
        console.log(`Batch ID: ${l.batchId}, Name: ${batch ? batch.name : 'Unknown'}, Biz: ${batch?.business?.name}, Count: ${l._count.id}`);
    });
}
run().catch(console.error).finally(() => prisma.$disconnect());
