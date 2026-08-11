const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leadsToReset = await prisma.lead.findMany({
        where: {
            batchId: 40,
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'OPEN_SEMINAR',
            coordinationRound: 3
        },
        select: {
            id: true
        }
    });

    const leadIds = leadsToReset.map(l => l.id);

    if (leadIds.length === 0) {
        console.log("No leads found to reset.");
        return;
    }

    console.log(`Found ${leadIds.length} leads. Resetting them to Round 1...`);

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
