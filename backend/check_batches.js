const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBatches() {
    // get business ID for art
    const biz = await prisma.business.findFirst({
        where: { name: 'මාස 06න් A/L - Art' }
    });
    console.log("Art Biz ID:", biz?.id);

    // Get all leads for this business
    const allLeads = await prisma.lead.findMany({
        where: { 
            campaignType: 'AFTER_SEMINAR',
            OR: [
                { phone: { endsWith: `_BIZ_${biz.id}` } },
                { phone: { endsWith: `_BIZ_${biz.id}_AS` } },
                { phone: { contains: `_BIZ_${biz.id}_BATCH_` } }
            ]
        },
        select: { batchId: true, inquiryType: true }
    });

    console.log("Total leads for Art:", allLeads.length);
    
    // Group by batchId
    const batchCounts = {};
    for(const l of allLeads) {
        const bid = l.batchId === null ? 'NULL' : l.batchId;
        batchCounts[bid] = (batchCounts[bid] || 0) + 1;
    }
    
    console.log("Leads per batchId:", batchCounts);

    // Get actual batches
    const batches = await prisma.batch.findMany({
        where: { businessId: biz.id },
        select: { id: true, name: true }
    });
    console.log("Batches for this biz:", batches);
}

checkBatches().catch(console.error).finally(() => prisma.$disconnect());
