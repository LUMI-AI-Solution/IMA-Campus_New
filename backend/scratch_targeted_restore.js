const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting targeted restoration process...");

  // We find leads that were touched by the revert script (updated today after 03:23)
  // Or we can just find any lead that has a mismatch between its pending status and its latest progress.
  
  // Let's just find ALL leads and fix their specific tab statuses if they are currently pending but progress says otherwise.
  const leads = await prisma.lead.findMany({
      include: { 
          roundProgress: { 
              orderBy: { createdAt: 'desc' }, 
              where: { callStatus: { not: 'pending' }, campaignCategory: { in: ['OPEN_SEM', 'NEW_INQ', 'PAID'] } } 
          } 
      }
  });

  let updateCount = 0;
  
  for (const lead of leads) {
      if (!lead.roundProgress || lead.roundProgress.length === 0) continue;

      let updateData = {};
      
      // Group by category to find the LATEST progress for each category
      const latestOpenSem = lead.roundProgress.find(p => p.campaignCategory === 'OPEN_SEM');
      const latestNewInq = lead.roundProgress.find(p => p.campaignCategory === 'NEW_INQ');
      const latestPaid = lead.roundProgress.find(p => p.campaignCategory === 'PAID');

      if (latestOpenSem && lead.openSemCallStatus === 'pending' && latestOpenSem.callStatus !== 'pending') {
          updateData.openSemCallStatus = latestOpenSem.callStatus;
          updateData.openSemCallAttempt = latestOpenSem.callAttempt || 1;
          updateData.openSemCallMethod = latestOpenSem.callMethod || 'direct';
          updateData.openSemFeedback = latestOpenSem.feedback || lead.openSemFeedback;
          updateData.openSemRound = latestOpenSem.roundNum;
          updateData.openSemPhase = latestOpenSem.phase || 1;
      }
      
      if (latestNewInq && lead.newInqCallStatus === 'pending' && latestNewInq.callStatus !== 'pending') {
          updateData.newInqCallStatus = latestNewInq.callStatus;
          updateData.newInqCallAttempt = latestNewInq.callAttempt || 1;
          updateData.newInqCallMethod = latestNewInq.callMethod || 'direct';
          updateData.newInqFeedback = latestNewInq.feedback || lead.newInqFeedback;
          updateData.newInqRound = latestNewInq.roundNum;
          updateData.newInqPhase = latestNewInq.phase || 1;
      }

      if (latestPaid && lead.paidCallStatus === 'pending' && latestPaid.callStatus !== 'pending') {
          updateData.paidCallStatus = latestPaid.callStatus;
          updateData.paidCallAttempt = latestPaid.callAttempt || 1;
          updateData.paidCallMethod = latestPaid.callMethod || 'direct';
          updateData.paidFeedback = latestPaid.feedback || lead.paidFeedback;
          updateData.paidRound = latestPaid.roundNum;
          updateData.paidPhase = latestPaid.phase || 1;
      }

      if (Object.keys(updateData).length > 0) {
          await prisma.lead.update({
              where: { id: lead.id },
              data: updateData
          });
          updateCount++;
      }
  }

  console.log(`Successfully restored statuses for ${updateCount} leads based on category-specific progress!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
