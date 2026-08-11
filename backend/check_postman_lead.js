const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const lead = await prisma.lead.findFirst({
    where: { phone: { startsWith: '94712209030' } }
  });
  console.log("Postman Lead:", lead);
}
run();
