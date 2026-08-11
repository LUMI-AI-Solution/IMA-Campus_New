const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const lead = await prisma.lead.findFirst({ 
    where: { phone: '94714941559_BIZ_13_AS' } 
  });
  console.log(lead);
}
main().finally(() => prisma.$disconnect());
