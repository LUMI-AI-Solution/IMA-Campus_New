const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOpenSemRound() {
    const leads = await prisma.lead.findMany({
        where: {
            batchId: 39,
            openSemRound: 3,
            assignedTo: 31
        }
    });

    console.log(`Found ${leads.length} leads for Hansi in Batch 39 with openSemRound = 3`);
    
    // Check all openSemRound > 1 for Batch 39
    const allRound2Or3 = await prisma.lead.findMany({
        where: {
            batchId: 39,
            openSemRound: { in: [2, 3] }
        }
    });
    console.log(`Found ${allRound2Or3.length} leads overall in Batch 39 with openSemRound > 1`);
}

checkOpenSemRound().catch(e => console.error(e)).finally(() => prisma.$disconnect());
