const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.crmSettings.findFirst({
      where: { waNumId: '1332485498989508' } // NO wait, receivingWaNumId is from metadata.phone_number_id
  });
  console.log(settings);
}
main().finally(() => prisma.$disconnect());
