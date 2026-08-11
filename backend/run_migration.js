const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { 
            campaignType: 'FREE_SEMINAR',
            phase: { gt: 1 }
        }
    });

    console.log(`Processing ${leads.length} leads...`);

    let updatedCount = 0;
    
    for (const lead of leads) {
        const isNoAnswer = lead.callStatus.toLowerCase() === 'no_answer';
        const currentPhase = lead.phase;

        // Create Round 1 progress (must be no_answer)
        if (currentPhase >= 2) {
            await prisma.leadRoundProgress.upsert({
                where: { leadId_roundNum: { leadId: lead.id, roundNum: 1 } },
                update: {}, // if exists, leave it
                create: {
                    leadId: lead.id,
                    roundNum: 1,
                    phase: 1,
                    callStatus: 'no_answer',
                    callMethod: lead.callMethod || 'direct',
                    callAttempt: 1,
                    feedback: 'Auto-recovered'
                }
            });
        }

        // Create Round 2 progress (must be no_answer if they are in phase 3)
        if (currentPhase >= 3) {
            await prisma.leadRoundProgress.upsert({
                where: { leadId_roundNum: { leadId: lead.id, roundNum: 2 } },
                update: {},
                create: {
                    leadId: lead.id,
                    roundNum: 2,
                    phase: 2,
                    callStatus: 'no_answer',
                    callMethod: lead.callMethod || 'direct',
                    callAttempt: 1,
                    feedback: 'Auto-recovered'
                }
            });
        }
        
        // Now handle their CURRENT phase status
        if (isNoAnswer) {
            // They just arrived in this phase, reset to pending
            await prisma.lead.update({
                where: { id: lead.id },
                data: { callStatus: 'pending' }
            });
            updatedCount++;
        } else {
            // They were answered/reject in current phase, so backfill a progress for current phase
            await prisma.leadRoundProgress.upsert({
                where: { leadId_roundNum: { leadId: lead.id, roundNum: currentPhase } },
                update: {
                    callStatus: lead.callStatus,
                    feedback: lead.feedback
                },
                create: {
                    leadId: lead.id,
                    roundNum: currentPhase,
                    phase: currentPhase,
                    callStatus: lead.callStatus,
                    callMethod: lead.callMethod || 'direct',
                    callAttempt: lead.callAttempt || 1,
                    feedback: lead.feedback || ''
                }
            });
        }
    }

    console.log(`Done! Recovered ${updatedCount} leads to pending state in their new phases.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
