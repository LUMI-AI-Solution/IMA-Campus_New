const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'OPEN_SEMINAR',
            coordinationRound: 1,
            enrollmentStatus: { notIn: ['PAID', 'ENROLLED', 'ENROLLED_FULL', 'ENROLLED_MONTHLY', 'ENROLLED_INSTALLMENT'] }
        },
        include: {
            batch: true
        }
    });

    const groups = {};
    leads.forEach(l => {
        const key = `${l.batch?.name || 'No Batch'}`;
        groups[key] = (groups[key] || 0) + 1;
    });
    console.log(groups);
}
main().catch(console.error).finally(() => prisma.$disconnect());
