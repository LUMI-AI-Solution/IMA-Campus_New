const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBatch39Leads() {
    const batchId = 39;

    console.log(`Checking ALL leads for Batch 39...`);

    const leads = await prisma.lead.findMany({
        where: {
            batchId: batchId,
        }
    });

    console.log(`Total Leads in Batch 39: ${leads.length}`);

    const inRound3 = leads.filter(l => l.coordinationRound === 3);
    console.log(`Total in Non Enrolled (Round 3): ${inRound3.length}`);
    
    if (inRound3.length > 0) {
        console.log("Sample Non Enrolled Leads:");
        inRound3.slice(0, 5).forEach(l => {
            console.log(`ID: ${l.id}, Campaign: ${l.campaignType}, Source: ${l.source}`);
        });
    }

}

checkBatch39Leads().catch(e => console.error(e)).finally(() => prisma.$disconnect());
