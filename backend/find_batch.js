const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const batches = await prisma.batch.findMany();
  for (const b of batches) {
    const leads = await prisma.lead.findMany({ where: { batchId: b.id, campaignType: 'FREE_SEMINAR' }});
    if (leads.length > 0) {
      const assigned = leads.filter(l => l.assignedTo).length;
      if (leads.length === 412 || assigned === 236) {
        console.log(`Match found in Batch ${b.id} (${b.name}): Total ${leads.length}, Assigned ${assigned}`);
        
        let notNew = 0;
        let ccReq = 0;
        for (const l of leads) {
          if (!l.assignedTo) {
            if (l.status !== 'NEW') notNew++;
            if (l.callCenterRequestStatus && l.callCenterRequestStatus !== 'REJECTED') ccReq++;
          }
        }
        console.log(`  Unassigned, Status != NEW: ${notNew}`);
        console.log(`  Unassigned, CC Req: ${ccReq}`);
      }
    }
  }
}
check().catch(console.error).finally(() => prisma.$disconnect());
