const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const settings = await prisma.crmSettings.findMany({
    select: { id: true, businessId: true, waNumId: true, waId: true, campaignType: true }
  });
  console.log(settings);
}
run();
