const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Reset Round 2 and 3 leads for Batch 39 (Commerce August)
    // 2. Reset Round 2 and 3 leads for Batch 40 (Art August - 3 is already done but we include it just in case)
    
    const leadsToReset = await prisma.lead.findMany({
        where: {
            batchId: { in: [39, 40] },
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'OPEN_SEMINAR',
            coordinationRound: { in: [2, 3] }
        },
        select: {
            id: true,
            batchId: true
        }
    });

    const leadIds = leadsToReset.map(l => l.id);

    if (leadIds.length === 0) {
        console.log("No leads found to reset.");
        return;
    }

    console.log(`Found ${leadIds.length} leads across both batches to reset.`);
    
    const batch39Count = leadsToReset.filter(l => l.batchId === 39).length;
    const batch40Count = leadsToReset.filter(l => l.batchId === 40).length;
    console.log(`Batch 39 (Commerce): ${batch39Count} leads`);
    console.log(`Batch 40 (Art): ${batch40Count} leads`);

    // 1. Delete existing LeadRoundProgress for these leads to clear history
    const deleteProgressResult = await prisma.leadRoundProgress.deleteMany({
        where: {
            leadId: { in: leadIds }
        }
    });
    console.log(`Deleted ${deleteProgressResult.count} LeadRoundProgress records.`);

    // 2. Update the leads to fresh Round 1
    const updateResult = await prisma.lead.updateMany({
        where: {
            id: { in: leadIds }
        },
        data: {
            assignedAt: new Date(),
            coordinationRound: 1,
            phase: 1,
            callStatus: 'pending',
            callAttempt: 1,
            callMethod: null,
            feedback: null,
            openSemRound: 1,
            openSemPhase: 1,
            openSemCallStatus: 'pending',
            openSemCallAttempt: 1,
            openSemCallMethod: null,
            openSemFeedback: null,
            enrollmentStatus: 'NON_ENROLLED', // Keep as non enrolled until they actually pay
            updatedAt: new Date()
        }
    });

    console.log(`Successfully reset ${updateResult.count} leads to Round 1.`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
