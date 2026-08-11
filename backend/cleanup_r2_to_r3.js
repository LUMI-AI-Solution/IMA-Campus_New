const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log("Starting cleanup for covered R2 leads...");
    let pushedCount = 0;

    const r2Leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'NEW_INQ',
            coordinationRound: 2,
            callStatus: { not: 'pending' }
        }
    });

    for (const lead of r2Leads) {
        // Push to Round 3
        await prisma.leadRoundProgress.create({
            data: {
                leadId: lead.id,
                roundNum: 2,
                callStatus: lead.callStatus,
                callMethod: lead.callMethod || 'direct',
                callAttempt: lead.callAttempt || 1,
                feedback: lead.feedback || ''
            }
        });
        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                coordinationRound: 3,
                phase: 1,
                callStatus: 'pending',
                callAttempt: 1,
                feedback: '',
                isLocked: false
            }
        });
        pushedCount++;
    }

    console.log(`Pushed ${pushedCount} covered R2 leads to Non-Enrolled (Round 3).`);
}
run();
