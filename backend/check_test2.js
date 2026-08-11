const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const lead = await prisma.lead.findFirst({
    where: { phone: '94770000001_BIZ_14' }
  });
  console.log("Test Lead 2:", lead);
}
run();
