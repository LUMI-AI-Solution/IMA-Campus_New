const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const lead = await prisma.lead.findFirst({ 
    where: { phone: { contains: 'BIZ_13_AS' } }, 
    orderBy: { updatedAt: 'desc' } 
  });
  console.log(lead);
}
main().finally(() => prisma.$disconnect());
