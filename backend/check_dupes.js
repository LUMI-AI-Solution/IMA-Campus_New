const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.lead.findMany({ where: { assignedTo: 1497, campaignType: 'FREE_SEMINAR' }, select: { id: true, name: true, callStatus: true } }).then(leads => {
    console.log(leads.length + ' leads found.');
    console.log(leads.slice(0, 10));
}).finally(()=>prisma.$disconnect());
