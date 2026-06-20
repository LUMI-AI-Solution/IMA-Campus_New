const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const p = await prisma.payment.findFirst({
      where: { id: 1042 } // Or just grab one that has subjects
  });
  console.log(p);
  const p2 = await prisma.payment.findFirst({
      where: { subjects: { contains: "[" } },
      select: { id: true, subjects: true }
  });
  console.log(p2);
}
test().catch(console.error).finally(() => prisma.$disconnect());
