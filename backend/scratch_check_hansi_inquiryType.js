const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHansiInquiryType() {
    const leads = await prisma.lead.findMany({
        where: {
            assignedTo: 31,
            coordinationRound: 3,
            inquiryType: 'OPEN_SEMINAR'
        }
    });

    const byBatch = {};
    leads.forEach(l => {
        byBatch[l.batchId] = (byBatch[l.batchId] || 0) + 1;
    });

    console.log("Hansi's Non-Enrolled OPEN_SEMINAR leads by batch:");
    console.log(byBatch);
}

checkHansiInquiryType().catch(e => console.error(e)).finally(() => prisma.$disconnect());
