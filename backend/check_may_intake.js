const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: { assignedUser: { firstName: 'Thisuri' }, campaignType: 'FREE_SEMINAR', batchId: 5 }
    });
    
    let phaseCount = {};
    leads.forEach(l => {
        let key = "Phase: " + l.phase + " | Status: " + (l.callStatus || 'null');
        phaseCount[key] = (phaseCount[key] || 0) + 1;
    });
    
    console.log("May Intake Leads:", phaseCount);
}
check().catch(console.error).finally(() => prisma.$disconnect());
