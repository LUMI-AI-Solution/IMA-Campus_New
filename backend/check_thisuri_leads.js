const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 8 }, // Assuming Thisuri is 8, or I can search by name
        include: { assignedUser: true }
    });
    
    // Find Thisuri's ID
    const thisuriLeads = await prisma.lead.findMany({
        where: { assignedUser: { firstName: 'Thisuri' }, campaignType: 'FREE_SEMINAR' }
    });
    
    console.log("Total Free Seminar leads for Thisuri:", thisuriLeads.length);
    
    let callCenter = 0;
    let requested = 0;
    let approved = 0;
    let rejected = 0;
    let isCallCenterTrue = 0;
    
    thisuriLeads.forEach(l => {
        if (l.callCenterRequestStatus) callCenter++;
        if (l.callCenterRequestStatus === 'REQUESTED') requested++;
        if (l.callCenterRequestStatus === 'APPROVED') approved++;
        if (l.callCenterRequestStatus === 'REJECTED') rejected++;
        if (l.isCallCenter) isCallCenterTrue++;
    });
    
    console.log(`Has callCenterRequestStatus: ${callCenter}`);
    console.log(`REQUESTED: ${requested}`);
    console.log(`APPROVED: ${approved}`);
    console.log(`REJECTED: ${rejected}`);
    console.log(`isCallCenter == true: ${isCallCenterTrue}`);
    
}
check().catch(console.error).finally(() => prisma.$disconnect());
