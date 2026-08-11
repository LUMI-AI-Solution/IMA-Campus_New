const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStuckLeads() {
    try {
        console.log("Finding stuck leads in Round 1...");

        const stuckLeads = await prisma.lead.findMany({
            where: {
                inquiryType: 'OPEN_SEMINAR',
                openSemRound: 1,
                OR: [
                    { openSemCallStatus: 'answered' },
                    { openSemPhase: 2, openSemCallStatus: 'no_answer' }
                ]
            }
        });

        console.log(`Found ${stuckLeads.length} stuck leads. Fixing them...`);

        for (const lead of stuckLeads) {
            await prisma.$transaction(async (tx) => {
                // Update the lead to Round 2
                await tx.lead.update({
                    where: { id: lead.id },
                    data: {
                        openSemRound: 2,
                        openSemPhase: 1,
                        openSemCallStatus: 'pending'
                    }
                });

                // Get the old remark from Round 1 if available
                const r1Progress = await tx.leadRoundProgress.findFirst({
                    where: { leadId: lead.id, roundNum: 1, campaignCategory: 'OPEN_SEMINAR' },
                    orderBy: { updatedAt: 'desc' }
                });

                // Upsert Round 1 progress just in case it doesn't exist
                await tx.leadRoundProgress.upsert({
                    where: {
                        leadId_roundNum_campaignCategory: {
                            leadId: lead.id,
                            roundNum: 1,
                            campaignCategory: 'OPEN_SEMINAR'
                        }
                    },
                    update: {
                        phase: lead.openSemPhase || 1,
                        callStatus: lead.openSemCallStatus || 'pending',
                        callMethod: lead.openSemCallMethod || 'direct',
                        callAttempt: lead.openSemCallAttempt || 1,
                        feedback: lead.openSemFeedback || ''
                    },
                    create: {
                        leadId: lead.id,
                        roundNum: 1,
                        campaignCategory: 'OPEN_SEMINAR',
                        phase: lead.openSemPhase || 1,
                        callStatus: lead.openSemCallStatus || 'pending',
                        callMethod: lead.openSemCallMethod || 'direct',
                        callAttempt: lead.openSemCallAttempt || 1,
                        feedback: lead.openSemFeedback || ''
                    }
                });

                // Create a Round 2 progress entry
                await tx.leadRoundProgress.upsert({
                    where: {
                        leadId_roundNum_campaignCategory: {
                            leadId: lead.id,
                            roundNum: 2,
                            campaignCategory: 'OPEN_SEMINAR'
                        }
                    },
                    update: {},
                    create: {
                        leadId: lead.id,
                        roundNum: 2,
                        campaignCategory: 'OPEN_SEMINAR',
                        phase: 1,
                        callStatus: 'pending',
                        callMethod: lead.openSemCallMethod || 'direct',
                        callAttempt: 0,
                        feedback: r1Progress?.feedback || lead.openSemFeedback || ''
                    }
                });
            });
        }

        console.log("Successfully fixed all stuck leads! They are now in Round 2.");
    } catch (error) {
        console.error("Error fixing leads:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixStuckLeads();
