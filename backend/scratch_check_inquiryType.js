const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInquiryType() {
    const batchId = 39;
    console.log(`Checking Batch 39 leads with inquiryType = OPEN_SEMINAR`);

    const leads = await prisma.lead.findMany({
        where: {
            batchId: batchId,
            inquiryType: 'OPEN_SEMINAR',
            coordinationRound: { in: [2, 3] }
        }
    });

    console.log(`Found ${leads.length} leads in Round 2 or 3.`);
    
    // Also let's check ALL leads in Round 3 for Hansi (assignedTo = 31)
    const hansiLeads = await prisma.lead.findMany({
        where: {
            assignedTo: 31,
            coordinationRound: 3,
            inquiryType: 'OPEN_SEMINAR'
        }
    });
    console.log(`Hansi has ${hansiLeads.length} leads with inquiryType = OPEN_SEMINAR in Round 3.`);
}

checkInquiryType().catch(e => console.error(e)).finally(() => prisma.$disconnect());
