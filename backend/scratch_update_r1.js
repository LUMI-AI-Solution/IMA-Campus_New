const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'OPEN_SEMINAR',
            batchId: 26,
            coordinationRound: 1,
            enrollmentStatus: { notIn: ['PAID', 'ENROLLED', 'ENROLLED_FULL', 'ENROLLED_MONTHLY', 'ENROLLED_INSTALLMENT'] }
        }
    });

    console.log(`Found ${leads.length} Round 1 leads for Batch 26 (2027 July AL Art).`);

    /*
    const updated = await prisma.lead.updateMany({
        where: {
            inquiryType: 'OPEN_SEMINAR',
            batchId: 26,
            coordinationRound: 1,
            enrollmentStatus: { notIn: ['PAID', 'ENROLLED', 'ENROLLED_FULL', 'ENROLLED_MONTHLY', 'ENROLLED_INSTALLMENT'] }
        },
        data: {
            coordinationRound: 2,
            openSemCallStatus: 'pending',
            openSemPhase: 2,
            newInqTimestamp: new Date()
        }
    });
    console.log(`Updated:`, updated);
    */
}
main().catch(console.error).finally(() => prisma.$disconnect());
