const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { batch: true, assignedUser: true }
  });
  console.log(JSON.stringify(leads, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
