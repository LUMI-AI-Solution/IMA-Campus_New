const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.lead.findMany({ where: { phone: { contains: '498333' } }, include: { assignedUser: true } })
.then(l => console.log(l))
.finally(() => prisma.$disconnect());
