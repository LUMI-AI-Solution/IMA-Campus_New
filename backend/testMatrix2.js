const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const courses = await prisma.course.findMany({
    where: { group: { batchId: 5 } },
    select: { id: true, name: true, price: true }
  });
  console.log('Courses:', courses);
}
test().catch(console.error).finally(() => prisma.$disconnect());
