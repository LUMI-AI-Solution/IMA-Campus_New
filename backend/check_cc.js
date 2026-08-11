const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const leads = await prisma.lead.findMany({
    where: { 
      campaignType: 'FREE_SEMINAR',
    },
    include: {
      assignedUser: true
    }
  });

  const missing = leads.filter(l => {
     if (!l.assignedTo) return false; // Unassigned
     const isCCAgent = l.assignedUser && ['CALLER', 'CALL_CENTER_AGENT', 'CALL_CENTER'].includes(String(l.assignedUser.role).toUpperCase().replace(/ /g, '_'));
     if (isCCAgent) return false; // Assigned to CC
     
     // Assigned to Coordinator, but has call_center status
     return (l.callCenterRequestStatus === 'REQUESTED' || l.callCenterRequestStatus === 'APPROVED');
  });

  console.log('Total Missing Leads:', missing.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
