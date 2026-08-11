const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.crmSettings.findFirst({
      where: { waNumId: '1315264348327767' }
  });
  console.log(settings);
}
main().finally(() => prisma.$disconnect());
