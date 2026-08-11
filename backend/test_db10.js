const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const lead = await prisma.lead.findUnique({ where: { id: 64501 } });
  console.log(lead);
}
main().finally(() => prisma.$disconnect());
