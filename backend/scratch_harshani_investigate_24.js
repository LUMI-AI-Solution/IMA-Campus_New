const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting restore process...");

  // Get all LeadRoundProgress records that are NOT pending
  // We want the LATEST record per lead
  const allProgress = await prisma.leadRoundProgress.findMany({
    where: { callStatus: { not: 'pending' } },
    orderBy: { createdAt: 'desc' }
  });

  const latestMap = {};
  allProgress.forEach(p => {
    if (!latestProgressMap[p.leadId]) {
      latestProgressMap[p.leadId] = p;
    }
  });

  const leadsToUpdate = Object.values(latestProgressMap);
  console.log(`Found ${leadsToUpdate.length} leads to restore from progress...`);

  let updatedCount = 0;
  for (const p of leadsToUpdate) {
     const updateData = {
         callStatus: p.callStatus,
         callAttempt: p.callAttempt,
         callMethod: p.callMethod,
         feedback: p.feedback
     };

     // depending on the category, update the specific fields too
     if (p.campaignCategory === 'OPEN_SEM') {
         updateData.openSemCallStatus = p.callStatus;
         updateData.openSemCallAttempt = p.callAttempt;
         updateData.openSemCallMethod = p.callMethod;
         updateData.openSemFeedback = p.feedback;
         updateData.openSemRound = p.roundNum;
         updateData.openSemPhase = p.phase;
     } else if (p.campaignCategory === 'NEW_INQ') {
         updateData.newInqCallStatus = p.callStatus;
         updateData.newInqCallAttempt = p.callAttempt;
         updateData.newInqCallMethod = p.callMethod;
         updateData.newInqFeedback = p.feedback;
         updateData.newInqRound = p.roundNum;
         updateData.newInqPhase = p.phase;
     } else if (p.campaignCategory === 'PAID') {
         updateData.paidCallStatus = p.callStatus;
         updateData.paidCallAttempt = p.callAttempt;
         updateData.paidCallMethod = p.callMethod;
         updateData.paidFeedback = p.feedback;
         updateData.paidRound = p.roundNum;
         updateData.paidPhase = p.phase;
     } else if (p.campaignCategory === 'DEFAULT') {
         // DEFAULT could mean it was done before the categories were introduced.
         // Let's update all of them so it shows up in whatever tab the lead is in!
         updateData.openSemCallStatus = p.callStatus;
         updateData.newInqCallStatus = p.callStatus;
     }

     await prisma.lead.update({
         where: { id: p.leadId },
         data: updateData
     });
     updatedCount++;
  }
  
  console.log(`Successfully restored statuses for ${updatedCount} leads!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
