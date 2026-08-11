const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const s = await prisma.crmSettings.findFirst({ where: { waNumId: '1435924168573355' } });
  console.log("waNumId:", s.waNumId);
  console.log("token:", s.metaApiKey);
}
run();
