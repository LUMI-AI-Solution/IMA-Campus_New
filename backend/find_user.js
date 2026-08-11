const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ where: { name: { contains: 'ishaka' } } }).then(console.log).finally(()=>prisma.$disconnect());
