const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const targetLeads = await prisma.lead.findMany({
        where: {
            inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
            coordinationRound: 1,
            enrollmentStatus: { notIn: ['PAID', 'ENROLLED', 'ENROLLED_FULL', 'ENROLLED_MONTHLY', 'ENROLLED_INSTALLMENT'] },
            batchId: 26, // 2027 July Intake - AL Art
            openSemCallStatus: { not: 'reject' }
        }
    });

    console.log(`Found ${targetLeads.length} leads in Round 1 (not rejected) for 2027 July Art Batch.`);

    let count = 0;
    for (const lead of targetLeads) {
        await prisma.leadRoundProgress.upsert({
            where: {
                leadId_roundNum_campaignCategory: {
                    leadId: lead.id,
                    roundNum: 1,
                    campaignCategory: 'OPEN_SEMINAR'
                }
            },
            create: {
                leadId: lead.id,
                campaignCategory: 'OPEN_SEMINAR',
                roundNum: 1,
                callStatus: 'answered',
                callAttempt: lead.openSemCallAttempt || 1,
                feedback: 'Automatically pushed to R2 (Bulk Update)'
            },
            update: {
                callStatus: 'answered',
                feedback: 'Automatically pushed to R2 (Bulk Update)'
            }
        });

        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                coordinationRound: 2,
                openSemRound: 2,
                openSemPhase: 2,
                openSemCallStatus: 'pending',
                openSemCallAttempt: 1,
                openSemFeedback: 'Automatically pushed to R2 (Bulk Update)',
                newInqTimestamp: new Date(),
                updatedAt: new Date()
            }
        });
        count++;
    }
    console.log(`Successfully updated ${count} leads to Round 2!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
