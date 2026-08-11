const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const leads = await prisma.lead.findMany({
    where: {
      phone: {
        contains: 'BIZ_14'
      }
    }
  });
  console.log("Leads for BIZ_14:", leads);
}

check().catch(console.error).finally(() => prisma.$disconnect());
