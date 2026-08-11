const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.leadRoundProgress.findMany({
        where: {
            roundNum: 1,
            lead: { inquiryType: 'NEW_INQ', coordinationRound: 2 }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { lead: true }
    });
    console.log(JSON.stringify(leads, null, 2));
}
run();
