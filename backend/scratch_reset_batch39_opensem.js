const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndResetBatch39OpenSem() {
    const batchId = 39;
    console.log(`Checking Batch 39 for Open Seminar leads...`);

    const leads = await prisma.lead.findMany({
        where: {
            batchId: batchId,
            campaignType: { in: ['OPEN_SEM', 'FREE_SEMINAR', 'AFTER_SEMINAR'] },
            coordinationRound: { in: [2, 3] }
        }
    });

    console.log(`Found ${leads.length} leads in Round 2 or 3.`);
    if (leads.length > 0) {
        console.log(`Updating ${leads.length} leads to Round 1...`);
        const leadIds = leads.map(l => l.id);
        
        await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: {
                coordinationRound: 1,
                phase: 1,
                callStatus: 'pending',
                assignedAt: new Date(),
                openSemRound: 1,
                openSemPhase: 1,
                openSemCallStatus: 'pending',
                openSemCallAttempt: 1,
                openSemFeedback: null
            }
        });
        
        const deleted = await prisma.leadRoundProgress.deleteMany({
            where: { leadId: { in: leadIds } }
        });
        
        console.log(`Successfully reset leads. Deleted ${deleted.count} progress records.`);
    } else {
        console.log("No leads to reset.");
    }
}

checkAndResetBatch39OpenSem().catch(e => console.error(e)).finally(() => prisma.$disconnect());
