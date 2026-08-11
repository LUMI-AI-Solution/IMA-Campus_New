const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: { assignedUser: { firstName: 'Thisuri' }, campaignType: 'FREE_SEMINAR' },
        include: { batch: true }
    });
    
    let batchIds = {};
    leads.forEach(l => {
        let bName = l.batch ? l.batch.name : 'NO BATCH';
        let bId = l.batchId;
        batchIds[bName + " (ID: " + bId + ")"] = (batchIds[bName + " (ID: " + bId + ")"] || 0) + 1;
    });
    
    console.log("Batches by ID:", batchIds);
}
check().catch(console.error).finally(() => prisma.$disconnect());
