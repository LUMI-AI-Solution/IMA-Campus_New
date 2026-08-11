const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const lead = await prisma.lead.findFirst({
    where: { phone: '94770000000_BIZ_14' }
  });
  console.log("Test Lead:", lead);
}
run();
