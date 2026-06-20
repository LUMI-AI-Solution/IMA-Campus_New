const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roundLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { phone: { contains: '_ROUND_' } },
        { phone: { contains: '_HISTORY_ROUND_' } }
      ]
    }
  });
  console.log(`Found ${roundLeads.length} leads with _ROUND_ or _HISTORY_ROUND_ in phone.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
