const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: { source: 'MOCK_INJECTOR' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { batch: true }
  });
  console.log(JSON.stringify(leads, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
