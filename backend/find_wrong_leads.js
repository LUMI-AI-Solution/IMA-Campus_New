const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: { 
      batchId: 6,
      phone: { contains: '_BIZ_1' }
    }
  });
  console.log(leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
