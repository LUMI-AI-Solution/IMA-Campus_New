const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const leads = await prisma.lead.findMany({
        where: {
            assignedUser: { firstName: { contains: 'Sandini' } },
            inquiryType: 'NEW_INQ',
            coordinationRound: 1,
            callStatus: { not: 'pending' },
            NOT: { callStatus: 'reject' } // Only answered, no_answer etc that should have moved
        },
        select: { id: true, phone: true, callStatus: true, callMethod: true, callAttempt: true, feedback: true, phase: true }
    });

    console.log("Fixing:", leads.length, "leads");

    for (const lead of leads) {
        // Save Round 1 history
        await prisma.leadRoundProgress.upsert({
            where: {
                leadId_roundNum: { leadId: lead.id, roundNum: 1 }
            },
            update: {
                phase: lead.phase || 1,
                callStatus: lead.callStatus || 'answered',
                callMethod: lead.callMethod || 'direct',
                callAttempt: lead.callAttempt || 1,
                feedback: lead.feedback || ''
            },
            create: {
                leadId: lead.id,
                roundNum: 1,
                phase: lead.phase || 1,
                callStatus: lead.callStatus || 'answered',
                callMethod: lead.callMethod || 'direct',
                callAttempt: lead.callAttempt || 1,
                feedback: lead.feedback || ''
            }
        });

        // Promote to Round 2
        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                coordinationRound: 2,
                phase: 1,
                callStatus: 'pending'
            }
        });
        
        console.log(`Promoted ${lead.phone} to Round 2`);
    }
}
fix().catch(console.error).finally(() => prisma.$disconnect());
