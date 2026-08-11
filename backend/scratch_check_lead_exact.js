const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.lead.findMany({ where: { phone: { contains: '94760566003_BIZ_13' } } })
.then(l => console.log(l))
.finally(() => prisma.$disconnect());
