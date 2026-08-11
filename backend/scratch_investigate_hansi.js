const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateHansiLeads() {
    console.log(`Checking Hansi's leads...`);
    
    // First, find Hansi Nawarathna's User ID
    const hansi = await prisma.user.findFirst({
        where: { firstName: { contains: 'Hansi' } }
    });
    
    if (!hansi) {
        console.log("Could not find Hansi Nawarathna.");
        return;
    }
    
    console.log(`Found Hansi: ID ${hansi.id}, Name: ${hansi.firstName} ${hansi.lastName}`);
    
    // Check her leads in Batch 39
    const batch39Leads = await prisma.lead.findMany({
        where: {
            assignedTo: hansi.id,
            batchId: 39
        }
    });
    
    console.log(`Hansi has ${batch39Leads.length} leads in Batch 39.`);
    
    const nonEnrolled = batch39Leads.filter(l => l.coordinationRound === 3);
    console.log(`Non Enrolled (Round 3) in Batch 39: ${nonEnrolled.length}`);
    
    // If not Batch 39, maybe they are in another batch?
    const allLeads = await prisma.lead.findMany({
        where: {
            assignedTo: hansi.id,
            coordinationRound: 3
        }
    });
    
    console.log(`Hansi has ${allLeads.length} TOTAL leads in Non Enrolled (Round 3) across ALL batches.`);
    
    const groupedByBatch = {};
    allLeads.forEach(l => {
        if (!groupedByBatch[l.batchId]) groupedByBatch[l.batchId] = [];
        groupedByBatch[l.batchId].push(l);
    });
    
    console.log("Breakdown by Batch:");
    for (const bId in groupedByBatch) {
        console.log(`Batch ${bId}: ${groupedByBatch[bId].length} leads (Campaign: ${groupedByBatch[bId][0].campaignType})`);
    }
}

investigateHansiLeads().catch(e => console.error(e)).finally(() => prisma.$disconnect());
