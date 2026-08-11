const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: { assignedUser: { firstName: 'Thisuri' }, campaignType: 'FREE_SEMINAR' },
        include: { batch: true }
    });
    
    let batchCount = {};
    leads.forEach(l => {
        let bName = l.batch ? l.batch.name : 'NO BATCH';
        batchCount[bName] = (batchCount[bName] || 0) + 1;
    });
    
    console.log("Batches:", batchCount);
}
check().catch(console.error).finally(() => prisma.$disconnect());
