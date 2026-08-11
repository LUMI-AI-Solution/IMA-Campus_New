const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const settings = await prisma.crmSettings.findFirst({ where: { businessId: 9 } });
  console.log(settings);
}
run();
