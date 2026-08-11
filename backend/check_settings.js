const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const settings = await prisma.crmSettings.findMany({
    where: { waNumId: '856685987538287' }
  });
  console.log("Settings for 856685987538287:", settings);
}
run();
