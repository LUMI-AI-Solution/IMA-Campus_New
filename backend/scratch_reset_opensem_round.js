const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetOpenSemRoundsBatch39() {
    const leads = await prisma.lead.findMany({
        where: {
            batchId: 39,
            openSemRound: { in: [2, 3] }
        }
    });

    console.log(`Found ${leads.length} leads in Batch 39 with openSemRound > 1.`);

    if (leads.length > 0) {
        const leadIds = leads.map(l => l.id);
        
        await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: {
                openSemRound: 1,
                openSemPhase: 1,
                openSemCallStatus: 'pending',
                openSemCallAttempt: 1,
                openSemFeedback: null,
                
                // Just in case, reset coordination round too for consistency
                coordinationRound: 1,
                phase: 1,
                callStatus: 'pending',
                assignedAt: new Date()
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

resetOpenSemRoundsBatch39().catch(e => console.error(e)).finally(() => prisma.$disconnect());
