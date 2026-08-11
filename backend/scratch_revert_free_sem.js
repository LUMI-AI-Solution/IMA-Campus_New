const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businessId = 17;
  
  // Revert FREE_SEMINAR for this business to empty or null for these fields
  const existingFreeSem = await prisma.crmSettings.findFirst({ where: { businessId, campaignType: 'FREE_SEMINAR' } });
  
  if (existingFreeSem) {
    await prisma.crmSettings.update({
      where: { id: existingFreeSem.id },
      data: {
        metaApiKey: null,
        waNumId: null,
        waId: null
      }
    });
    console.log("Reverted FREE_SEMINAR settings for businessId 17.");
  }
}
main().finally(() => prisma.$disconnect());
