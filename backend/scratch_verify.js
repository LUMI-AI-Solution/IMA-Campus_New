const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const r1 = await prisma.lead.count({
        where: {
            inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
            coordinationRound: 1,
            batchId: 26,
            openSemCallStatus: { not: 'reject' },
            enrollmentStatus: { notIn: ['PAID', 'ENROLLED', 'ENROLLED_FULL', 'ENROLLED_MONTHLY', 'ENROLLED_INSTALLMENT'] }
        }
    });
    
    const r2 = await prisma.lead.count({
        where: {
            inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] },
            coordinationRound: 2,
            batchId: 26,
            openSemCallStatus: { not: 'reject' }
        }
    });

    console.log(`R1 pending/delayed leads: ${r1}`);
    console.log(`R2 leads: ${r2}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
