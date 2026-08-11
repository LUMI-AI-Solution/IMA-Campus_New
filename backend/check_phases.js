const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: { assignedUser: { firstName: 'Thisuri' }, campaignType: 'FREE_SEMINAR' }
    });
    
    let phaseCount = {};
    let statusCount = {};
    leads.forEach(l => {
        phaseCount[l.phase] = (phaseCount[l.phase] || 0) + 1;
        statusCount[l.callStatus] = (statusCount[l.callStatus] || 0) + 1;
    });
    
    console.log("Phases:", phaseCount);
    console.log("Statuses:", statusCount);
}
check().catch(console.error).finally(() => prisma.$disconnect());
