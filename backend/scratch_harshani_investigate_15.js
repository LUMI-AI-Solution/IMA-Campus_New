const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const harshaniLeads = await prisma.lead.findMany({
    where: { 
      batchId: 26,
      campaignType: 'AFTER_SEMINAR',
      assignedTo: 49
    },
    select: { 
        id: true, 
        inquiryType: true, 
        openSemCallStatus: true,
        newInqCallStatus: true,
        callStatus: true,
        openSemRound: true,
        openSemPhase: true,
        assignedAt: true,
        source: true
    }
  });

  console.log(`Total AFTER_SEMINAR leads for Harshani in Batch 26: ${harshaniLeads.length}`);
  
  const inquiryTypes = harshaniLeads.reduce((acc, lead) => {
    acc[lead.inquiryType] = (acc[lead.inquiryType] || 0) + 1;
    return acc;
  }, {});
  console.log("Inquiry Types:", inquiryTypes);

  const openSemCallStatuses = harshaniLeads.reduce((acc, lead) => {
    acc[lead.openSemCallStatus] = (acc[lead.openSemCallStatus] || 0) + 1;
    return acc;
  }, {});
  console.log("Open Sem Call Statuses:", openSemCallStatuses);

  const newInqCallStatuses = harshaniLeads.reduce((acc, lead) => {
    acc[lead.newInqCallStatus] = (acc[lead.newInqCallStatus] || 0) + 1;
    return acc;
  }, {});
  console.log("New Inq Call Statuses:", newInqCallStatuses);

  const callStatuses = harshaniLeads.reduce((acc, lead) => {
    acc[lead.callStatus] = (acc[lead.callStatus] || 0) + 1;
    return acc;
  }, {});
  console.log("General Call Statuses (callStatus field):", callStatuses);
  
}

main().catch(console.error).finally(() => prisma.$disconnect());
