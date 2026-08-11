const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = await prisma.lead.findMany({
        where: {
            assignedUser: { firstName: { contains: 'Sandini' } },
            inquiryType: 'NEW_INQ',
            coordinationRound: 1,
            callStatus: { not: 'pending' }
        },
        select: { id: true, phone: true, callStatus: true, phase: true, coordinationRound: true, feedback: true }
    });
    console.log("Found:", leads.length);
    console.log(leads);
}
check().catch(console.error).finally(() => prisma.$disconnect());
