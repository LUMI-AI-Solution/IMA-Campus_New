const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { assignedTo: 49 },
        include: { roundProgress: { orderBy: { createdAt: 'desc' }, where: { callStatus: { not: 'pending' } } } }
    });

    let updateCount = 0;
    for (const lead of leads) {
        if (lead.roundProgress && lead.roundProgress.length > 0) {
            const p = lead.roundProgress[0]; // Latest non-pending progress
            let updateData = {
                callStatus: p.callStatus,
                callAttempt: p.callAttempt || 1,
                callMethod: p.callMethod || 'CALL',
                feedback: p.feedback || null,
            };

            if (p.campaignCategory === 'OPEN_SEM' || lead.inquiryType === 'OPEN_SEMINAR') {
                updateData.openSemCallStatus = p.callStatus;
                updateData.openSemPhase = p.phase || 1;
                updateData.openSemRound = p.round || 1;
                updateData.openSemCallAttempt = p.callAttempt || 1;
                updateData.openSemFeedback = p.feedback || null;
            } 
            if (p.campaignCategory === 'NEW_INQ' || lead.inquiryType === 'NEW_INQ') {
                updateData.newInqCallStatus = p.callStatus;
                updateData.newInqPhase = p.phase || 1;
                updateData.newInqRound = p.round || 1;
                updateData.newInqCallAttempt = p.callAttempt || 1;
                updateData.newInqFeedback = p.feedback || null;
            }

            await prisma.lead.update({ where: { id: lead.id }, data: updateData });
            updateCount++;
        }
    }
    console.log(`Successfully updated ${updateCount} leads exclusively for Harshani (Staff ID 49)!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
