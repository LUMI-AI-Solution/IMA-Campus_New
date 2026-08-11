const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const leads = await prisma.lead.findMany({
    where: {
      inquiryType: 'OPEN_SEMINAR',
      coordinationRound: 2,
      assignedAt: { gt: yesterday }
    },
    select: {
      id: true,
      phone: true,
      name: true,
      inquiryType: true,
      coordinationRound: true,
      phase: true,
      status: true,
      callStatus: true,
      assignedAt: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(leads, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
