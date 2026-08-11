const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const artBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Art' } }
    });

    const mayBatch = await prisma.batch.findFirst({
        where: { businessId: artBusiness?.id, name: { contains: 'MAY' } }
    });

    const leads = await prisma.lead.findMany({
        where: {
            assignedTo: 33,
            batchId: mayBatch.id,
            inquiryType: 'NEW_INQ'
        }
    });

    let round1 = 0;
    let round2 = 0;
    let nonEnrolled = 0;
    let paid = 0;

    for (const l of leads) {
        if (l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID') {
            paid++;
        } else if (l.coordinationRound === 1) {
            round1++;
        } else if (l.coordinationRound === 2) {
            round2++;
        } else if (l.coordinationRound === 3) {
            nonEnrolled++;
        }
    }

    console.log(`May Intake New Inq - R1: ${round1}, R2: ${round2}, Non-Enrolled: ${nonEnrolled}, Paid: ${paid}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
