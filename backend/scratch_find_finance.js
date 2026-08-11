const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
  where: { OR: [{ department: { contains: 'inance' } }, { role: { contains: 'inance' } }] },
  select: { id: true, firstName: true, role: true, department: true }
}).then(console.log).finally(() => prisma.$disconnect());
