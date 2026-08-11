const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const rounds = await prisma.leadRoundProgress.findMany({
        where: { campaignCategory: 'PAID' },
        orderBy: { updatedAt: 'desc' },
        take: 5
    });
    console.log("Latest PAID round progress:", JSON.stringify(rounds, null, 2));

    const leads = await prisma.lead.findMany({
        where: { paidCallStatus: { not: 'pending' } },
        select: { id: true, phone: true, paidCallStatus: true, callStatus: true },
        take: 5
    });
    console.log("Leads with paidCallStatus NOT pending:", leads);
}

test().finally(() => prisma.$disconnect());
