const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.crmSettings.findMany({
      where: { campaignType: 'AFTER_SEMINAR' }
  });
  console.log(settings.map(s => ({ b: s.businessId, w: s.waNumId, w3: s.metaApiKey?.substring(0,5) })));
}
main().finally(() => prisma.$disconnect());
