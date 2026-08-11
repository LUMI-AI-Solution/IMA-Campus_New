const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const p = await prisma.payment.findUnique({ where: { id: 3791 }, include: { student: true, group: true } });
  console.dir(p, { depth: null });
}
run().finally(() => prisma.$disconnect());
