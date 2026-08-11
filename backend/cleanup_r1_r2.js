const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log("Starting cleanup...");
    let revertedCount = 0;
    let pushedCount = 0;
    let phase2Count = 0;

    // 1. Revert Rejects from Round 2 to Round 1
    const r2Leads = await prisma.lead.findMany({
        where: { inquiryType: 'NEW_INQ', coordinationRound: 2 },
        include: { roundProgress: { where: { roundNum: 1 } } }
    });

    for (const lead of r2Leads) {
        if (lead.roundProgress && lead.roundProgress.length > 0) {
            const r1p = lead.roundProgress[0];
            if (r1p.callStatus === 'reject') {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        coordinationRound: 1,
                        phase: 1,
                        callStatus: 'reject',
                        feedback: r1p.feedback || ''
                    }
                });
                revertedCount++;
            }
        }
    }

    // 2. Push answered/no_answer to correct places
    const r1Leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'NEW_INQ',
            coordinationRound: 1,
            callStatus: { in: ['answered', 'no_answer'] }
        }
    });

    for (const lead of r1Leads) {
        if (lead.callStatus === 'answered' || (lead.phase === 2 && lead.callStatus === 'no_answer')) {
            // Push to Round 2
            await prisma.leadRoundProgress.create({
                data: {
                    leadId: lead.id,
                    roundNum: 1,
                    callStatus: lead.callStatus,
                    callMethod: lead.callMethod || 'direct',
                    callAttempt: lead.callAttempt || 1,
                    feedback: lead.feedback || ''
                }
            });
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    coordinationRound: 2,
                    phase: 1,
                    callStatus: 'pending',
                    callAttempt: 1,
                    feedback: '',
                    isLocked: false
                }
            });
            pushedCount++;
        } else if (lead.phase === 1 && lead.callStatus === 'no_answer') {
            // Move to Phase 2
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    phase: 2,
                    callStatus: 'pending',
                    callAttempt: 1,
                    feedback: ''
                }
            });
            phase2Count++;
        }
    }

    console.log(`Reverted ${revertedCount} rejects back to Round 1.`);
    console.log(`Pushed ${pushedCount} covered leads to Round 2.`);
    console.log(`Moved ${phase2Count} no_answers to Phase 2.`);
}
run();
