const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const c1 = await prisma.course.findUnique({ where: { id: 133 } });
  const c2 = await prisma.course.findUnique({ where: { id: 134 } });
  const c3 = await prisma.course.findUnique({ where: { id: 136 } });
  console.log("Courses:", c1, c2, c3);
}
test().catch(console.error).finally(() => prisma.$disconnect());
