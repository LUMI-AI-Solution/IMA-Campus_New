const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const courses19 = await prisma.course.findMany({ where: { groupId: 19 } });
  const courses20 = await prisma.course.findMany({ where: { groupId: 20 } });
  
  console.log("Group 19 courses:", courses19.map(c => ({ id: c.id, name: c.name })));
  console.log("Group 20 courses:", courses20.map(c => ({ id: c.id, name: c.name })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
