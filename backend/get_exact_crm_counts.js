const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businessId = 1;

  // Exact matching for "Select Batch (All)" with excludeColdBridge
  let countWhere = { campaignType: 'AFTER_SEMINAR', source: { not: 'system' }, AND: [] }; 
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

  const totalAll = await prisma.lead.count({ where: countWhere });
  console.log("Total matching Select Batch (All):", totalAll);

  const batchCounts = await prisma.lead.groupBy({
    by: ['batchId'],
    where: countWhere,
    _count: { id: true }
  });
  
  let sum = 0;
  console.log("Breakdown:");
  for (const g of batchCounts) {
    console.log(`Batch ${g.batchId === null ? 'UNASSIGNED' : g.batchId}: ${g._count.id}`);
    sum += g._count.id;
  }
  console.log("Sum of breakdown:", sum);
  console.log("Difference:", totalAll - sum);
}
main().catch(console.error).finally(() => prisma.$disconnect());
