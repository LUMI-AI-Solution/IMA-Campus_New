const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.crmSettings.findFirst({
      where: { campaignType: 'AFTER_SEMINAR', businessId: 13 }
  });
  console.log(settings);
}
main().finally(() => prisma.$disconnect());
