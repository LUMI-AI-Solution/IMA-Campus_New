const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businessId = 1;

  // Total matching for "Select Batch (All)" WITH excludeColdBridge logic
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

  // excludeColdBridge = true
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
  
  // Now count with batchId: null
  countWhere.batchId = null;
  const totalNoBatch = await prisma.lead.count({ where: countWhere });
  console.log("Total with NO batch:", totalNoBatch);

}
main().catch(console.error).finally(() => prisma.$disconnect());
