const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findUnique({
    where: { phone: '94702572577_BIZ_4' }
  });
  console.log(JSON.stringify(lead, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
