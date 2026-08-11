const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
  where: { department: { contains: 'inance' } },
  select: { id: true, firstName: true, role: true, department: true }
}).then(res => {
  res.forEach(r => console.log(`[${r.department}]`));
}).finally(() => prisma.$disconnect());
