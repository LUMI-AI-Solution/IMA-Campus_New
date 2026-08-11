const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const harshaniId = 49;
  
  const leads = await prisma.lead.findMany({
    where: { assignedTo: harshaniId, campaignType: 'FREE_SEMINAR' },
    take: 10
  });
  
  console.log("Sample FREE_SEMINAR leads for Harshani:", leads.map(l => ({ id: l.id, phone: l.phone, batchId: l.batchId })));
  
  const batches = await prisma.lead.groupBy({
      by: ['batchId'],
      where: { assignedTo: harshaniId, campaignType: 'FREE_SEMINAR' },
      _count: { id: true }
  });
  
  console.log("Batches for Harshani's FREE_SEMINAR leads:", batches);
  
  const uniquePhones = await prisma.lead.findMany({
    where: { assignedTo: harshaniId, campaignType: 'FREE_SEMINAR' },
    select: { phone: true },
    take: 10
  });
  
  console.log("Sample phones:", uniquePhones.map(l => l.phone));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
