const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: {
      phone: { in: ['94762022069', '94702572577'] }
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
