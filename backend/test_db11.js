const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.crmSettings.findUnique({
      where: {
          businessId_campaignType: { businessId: 13, campaignType: 'AFTER_SEMINAR' }
      }
  });
  console.log(settings);
}
main().finally(() => prisma.$disconnect());
