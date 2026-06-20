const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businessId = 1;

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

  const res = await prisma.lead.updateMany({
    where: {
      ...countWhere,
      batchId: 6
    },
    data: { batchId: null }
  });
  console.log(`Reset ${res.count} wrong leads from batch 6 to unassigned.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
