const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 48, inquiryType: 'OPEN_SEMINAR' }
    });
    
    let countPending = 0;
    let countCovered = 0;
    
    leads.forEach(l => {
        if (l.openSemCallStatus === 'pending') countPending++;
        else countCovered++;
    });
    
    console.log(`Kavishka (48) Open Seminar Leads:`);
    console.log(`Total: ${leads.length}`);
    console.log(`Pending: ${countPending}`);
    console.log(`Covered: ${countCovered}`);
    
    const sample = leads.filter(l => l.phone.includes('766231613'))[0];
    if (sample) console.log("Sample lead feedback:", sample.openSemFeedback);
}

main().catch(console.error).finally(() => prisma.$disconnect());
