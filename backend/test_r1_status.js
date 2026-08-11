const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'NEW_INQ',
            coordinationRound: 1,
            callStatus: { not: 'pending' }
        },
        select: { callStatus: true, phase: true }
    });
    console.log(leads.slice(0, 20));
}
run();
