const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.crmSettings.findFirst({
      where: { businessId: 13, campaignType: 'AFTER_SEMINAR' }
  });
  console.log("waNumId for 13:", settings.waNumId);
}
main().finally(() => prisma.$disconnect());
