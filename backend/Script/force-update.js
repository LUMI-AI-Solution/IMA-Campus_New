const { PrismaClient } = require('@prisma/client');
const prismaTaskGen = new PrismaClient();

async function forceMoveNow() {
    console.log("🚀 Forcing 5-Day Old Leads to Round 2...");
    
    const fiveDaysAgo = new Date(new Date().getTime() - (5 * 24 * 60 * 60 * 1000));

    const leadsToPush = await prismaTaskGen.lead.findMany({
        where: {
            campaignType: 'AFTER_SEMINAR',
            coordinationRound: 1, // Round 1 එකේ ඉන්න අය විතරයි
            enrollmentStatus: { not: 'ENROLLED' },
            updatedAt: { lte: fiveDaysAgo } // දවස් 5කට වඩා පරණයි
            // මෙතන callStatus filter එකක් නෑ. ඔක්කොම යනවා.
        }
    });

    console.log(`✅ Found ${leadsToPush.length} leads to move!`);

    let updatedCount = 0;

    for (const lead of leadsToPush) {
        const targetRound = 2;
        const basePhone = lead.phone.split('_ROUND_')[0]; 
        const newPhoneStr = `${basePhone}_ROUND_${targetRound}`;

        await prismaTaskGen.lead.upsert({
            where: { phone: newPhoneStr },
            update: {}, 
            create: {
                name: lead.name,
                phone: newPhoneStr,
                source: lead.source,
                campaignType: lead.campaignType,
                assignedTo: lead.assignedTo, 
                status: 'OPEN',
                phase: 1, 
                callStatus: 'pending', 
                paymentIntention: lead.paymentIntention,
                enrollmentStatus: lead.enrollmentStatus,
                text: lead.text,
                inquiryType: lead.inquiryType,
                newInqTimestamp: lead.newInqTimestamp,
                batchId: lead.batchId,
                feedback: lead.feedback, 
                coordinationRound: targetRound, 
                callAttempt: 1, 
                callMethod: lead.callMethod || 'direct', 
                isLocked: false,
                unreadCount: 0,
                autoReplyStep: lead.autoReplyStep,
                sequenceCompleted: lead.sequenceCompleted,
                assignedAt: lead.assignedTo ? new Date() : null
            }
        });
        updatedCount++;
    }

    console.log(`🎉 Successfully Pushed ${updatedCount} Leads to Round 2!`);
}

forceMoveNow();