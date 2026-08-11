const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const batchId = 26;
  const businessId = 1;

  // Let's get ALL leads for batch 26, assigned
  const assignedLeads = await prisma.lead.findMany({
    where: { 
      batchId: 26,
      assignedTo: { not: null },
      campaignType: 'AFTER_SEMINAR'
    },
    select: { id: true, phone: true, assignedTo: true }
  });

  console.log(`Total assigned AFTER_SEMINAR leads in Batch 26: ${assignedLeads.length}`);

  // How many match the businessId phone suffix logic?
  const matchedLeads = assignedLeads.filter(l => 
    l.phone.endsWith(`BIZ_${businessId}`) ||
    l.phone.endsWith(`BIZ_${businessId}_AS`) ||
    l.phone.includes(`BIZ_${businessId}_BATCH_`) ||
    l.phone.includes(`BIZ_${businessId}_ROUND_`) ||
    l.phone.includes(`BIZ_${businessId}_HISTORY_ROUND_`)
  );

  console.log(`Total assigned leads matching phone suffix logic: ${matchedLeads.length}`);
  
  // Who are they assigned to?
  const matchedUsers = matchedLeads.reduce((acc, lead) => {
    acc[lead.assignedTo] = (acc[lead.assignedTo] || 0) + 1;
    return acc;
  }, {});
  console.log("Matched leads assigned to:", matchedUsers);
  
  // What about FREE_SEMINAR?
  const freeSemLeads = await prisma.lead.findMany({
    where: { 
      batchId: 26,
      assignedTo: { not: null },
      campaignType: 'FREE_SEMINAR'
    },
    select: { id: true, phone: true, assignedTo: true }
  });

  const matchedFreeSemLeads = freeSemLeads.filter(l => 
    l.phone.endsWith(`_BIZ_${businessId}`) ||
    l.phone.includes(`_BIZ_${businessId}_`)
  );
  
  console.log(`\nTotal assigned FREE_SEMINAR leads in Batch 26: ${freeSemLeads.length}`);
  console.log(`Total assigned FREE_SEMINAR leads matching phone suffix logic: ${matchedFreeSemLeads.length}`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
