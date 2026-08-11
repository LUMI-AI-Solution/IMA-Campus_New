const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const settings = await prisma.campaignSetting.findMany();
  console.log(settings);
}
run();
