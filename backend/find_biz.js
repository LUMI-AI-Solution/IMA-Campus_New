const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.business.findMany({ where: { name: { contains: 'ishaka' } } }).then(console.log).finally(()=>prisma.$disconnect());
