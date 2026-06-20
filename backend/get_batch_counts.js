const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businessId = 1;

  let countWhere = { campaignType: 'AFTER_SEMINAR', source: { not: 'system' }, batchId: { not: null }, AND: [] }; 
  countWhere.AND.push({
      OR: [
          { phone: { endsWith: `BIZ_${businessId}` } },
          { phone: { endsWith: `BIZ_${businessId}_AS` } },
          { phone: { contains: `BIZ_${businessId}_BATCH_` } },
          { phone: { contains: `BIZ_${businessId}_ROUND_` } },
          { phone: { contains: `BIZ_${businessId}_HISTORY_ROUND_` } }
      ]
  });

  countWhere.AND.push({
      NOT: {
          AND: [
              { source: 'bridge_transfer' },
              { lastMessage: null }
          ]
      }
  });

  const batchCounts = await prisma.lead.groupBy({
    by: ['batchId'],
    where: countWhere,
    _count: { id: true }
  });
  
  console.log(batchCounts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
