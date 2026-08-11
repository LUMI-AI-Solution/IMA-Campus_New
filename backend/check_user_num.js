const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const leads = await prisma.lead.findMany({
    where: {
      phone: {
        contains: '44941559'
      }
    }
  });
  console.log("Leads for 44941559:", leads);

  const logs = await prisma.webhookLog.findMany({
    where: {
      message: {
        contains: '44941559'
      }
    }
  });
  console.log("Webhook logs containing 44941559:", logs);
}

check().catch(console.error).finally(() => prisma.$disconnect());
