const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const harshaniLeads = await prisma.lead.findMany({
    where: { 
      batchId: 26,
      campaignType: 'AFTER_SEMINAR',
      assignedTo: 49
    },
    select: { id: true, openSemCallStatus: true, newInqCallStatus: true, callStatus: true }
  });

  const leadIds = harshaniLeads.map(l => l.id);
  
  const progressRecords = await prisma.leadRoundProgress.findMany({
    where: { leadId: { in: leadIds }, callStatus: { not: 'pending' } },
    orderBy: { createdAt: 'desc' }
  });

  // Get the latest progress for each lead
  const latestProgressMap = {};
  progressRecords.forEach(p => {
    if (!latestProgressMap[p.leadId]) {
      latestProgressMap[p.leadId] = p;
    }
  });

  let validToRestore = 0;
  for (const lead of harshaniLeads) {
    const p = latestProgressMap[lead.id];
    if (p) {
      if (lead.openSemCallStatus === 'pending') {
          validToRestore++;
      }
    }
  }

  console.log(`Leads that have a non-pending progress record, but currently have 'pending' status: ${validToRestore}`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
