const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    const miduId = 33;
    const leads = await prisma.lead.groupBy({
        by: ['inquiryType', 'source'],
        where: {
            assignedTo: miduId,
            campaignType: 'AFTER_SEMINAR'
        },
        _count: true
    });
    console.log(leads);
}
check().finally(() => prisma.$disconnect());
