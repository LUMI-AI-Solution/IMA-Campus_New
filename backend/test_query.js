const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.lead.findUnique({where:{id:41615}}).then(console.log).finally(()=>prisma.$disconnect());
