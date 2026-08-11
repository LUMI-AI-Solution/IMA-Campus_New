const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.crmSettings.findFirst({
      where: { waNumId: '1246918395171738' }
  });
  console.log("BusinessID for webhook:", settings.businessId);
}
main().finally(() => prisma.$disconnect());
