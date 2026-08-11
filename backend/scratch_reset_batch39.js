const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndResetBatch39() {
    const batchId = 39;

    console.log(`Checking Batch ${batchId} for Open Seminar leads in Non Enrolled (Round 3) or Round 2...`);

    const leads = await prisma.lead.findMany({
        where: {
            batchId: batchId,
            campaignType: 'OPEN_SEM',
            coordinationRound: { in: [2, 3] }
        }
    });

    console.log(`Found ${leads.length} leads in Round 2 or 3.`);

    if (leads.length === 0) {
        console.log("No leads to reset.");
        return;
    }

    const leadIds = leads.map(l => l.id);

    // Reset leads
    const updated = await prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: {
            coordinationRound: 1,
            phase: 1,
            callStatus: 'pending',
            assignedAt: new Date() // Fresh assignedAt
        }
    });

    console.log(`Updated ${updated.count} leads to Round 1.`);

    // Delete progress history to make them completely fresh
    const deletedProgress = await prisma.leadRoundProgress.deleteMany({
        where: { leadId: { in: leadIds } }
    });

    console.log(`Deleted ${deletedProgress.count} progress records.`);
}

checkAndResetBatch39().catch(e => console.error(e)).finally(() => prisma.$disconnect());
