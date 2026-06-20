const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tutes = await prisma.tuteStock.findMany({
    include: { course: true }
  });
  console.log("Tute Stocks:");
  tutes.forEach(t => console.log(t.id, t.tuteName, '| Course:', t.course ? t.course.name : 'null'));
}
check().catch(console.error).finally(() => prisma.$disconnect());
