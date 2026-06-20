const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businessId = 1;
  const whereClause = {
    AND: [
      { batchId: null },
      {
        OR: [
          { phone: { endsWith: `BIZ_${businessId}` } },
          { phone: { endsWith: `BIZ_${businessId}_AS` } },
          { phone: { contains: `BIZ_${businessId}_BATCH_` } },
          { phone: { contains: `BIZ_${businessId}_ROUND_` } },
          { phone: { contains: `BIZ_${businessId}_HISTORY_ROUND_` } }
        ]
      }
    ]
  };

  const leads = await prisma.lead.findMany({
    where: whereClause
  });
  
  const sources = {};
  leads.forEach(l => {
    sources[l.source] = (sources[l.source] || 0) + 1;
  });
  console.log("Sources:", sources);
}
main().catch(console.error).finally(() => prisma.$disconnect());
