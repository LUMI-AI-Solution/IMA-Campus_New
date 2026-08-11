const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.leadRoundProgress.findMany({
    where: { lead: { assignedTo: 1497, campaignType: 'FREE_SEMINAR' } },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: { lead: { select: { callStatus: true, phase: true, name: true } } }
}).then(console.log).finally(()=>prisma.$disconnect());
