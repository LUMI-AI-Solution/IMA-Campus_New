const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const p = await prisma.payment.findUnique({ where: { id: 3975 } });
  console.log(p);
}
run();
