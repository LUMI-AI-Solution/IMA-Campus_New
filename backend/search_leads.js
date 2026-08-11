const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.lead.findMany({
    where: { OR: [ { name: { contains: 'Wishaka' } }, { name: { contains: 'Vishaka' } } ] }
}).then(console.log).finally(()=>prisma.$disconnect());
