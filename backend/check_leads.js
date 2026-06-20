const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Let's find out the business ID for "මාස 06න් A/L - Art"
  const businesses = await prisma.business.findMany({
    where: { name: { contains: 'Art' } }
  });
  console.log("Businesses:", businesses.map(b => ({id: b.id, name: b.name})));
  
  if (businesses.length > 0) {
    const businessId = businesses[0].id;
    
    // Count all leads for this business
    const allLeadsCount = await prisma.lead.count({
      where: { businessId: businessId }
    });
    console.log("Total leads for business:", allLeadsCount);
    
    // Count leads GROUPED BY batchId
    const leadsByBatch = await prisma.lead.groupBy({
      by: ['batchId'],
      where: { businessId: businessId },
      _count: { id: true }
    });
    
    console.log("Leads grouped by batchId:", leadsByBatch);
    
    // Get batch names
    const batchIds = leadsByBatch.map(g => g.batchId).filter(id => id !== null);
    const batches = await prisma.batch.findMany({
      where: { id: { in: batchIds } }
    });
    
    const batchMap = {};
    batches.forEach(b => batchMap[b.id] = b.name);
    
    leadsByBatch.forEach(group => {
      console.log(`Batch ID: ${group.batchId} (${group.batchId ? batchMap[group.batchId] : 'NO BATCH'}) - Count: ${group._count.id}`);
    });
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
