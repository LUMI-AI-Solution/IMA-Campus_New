const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const afterSemSettings = await prisma.crmSettings.findMany({
    where: { campaignType: 'AFTER_SEMINAR' }
  });
  console.log("After Seminar Settings:", afterSemSettings);
}
run();
