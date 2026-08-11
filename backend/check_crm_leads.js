const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({ where: { campaignType: 'FREE_SEMINAR' } });
  
  const stats = {
    total: leads.length,
    statusCount: {},
    assignedCount: { hasAssigned: 0, noAssigned: 0 },
    callCenterCount: {},
    sourceCount: {},
    newTabConditions: 0,
    assignedTabConditions: 0
  };

  leads.forEach(l => {
    stats.statusCount[l.status] = (stats.statusCount[l.status] || 0) + 1;
    if (l.assignedTo) stats.assignedCount.hasAssigned++;
    else stats.assignedCount.noAssigned++;
    
    const cc = l.callCenterRequestStatus || 'null';
    stats.callCenterCount[cc] = (stats.callCenterCount[cc] || 0) + 1;
    
    const src = l.source || 'null';
    stats.sourceCount[src] = (stats.sourceCount[src] || 0) + 1;

    // Simulate NEW logic
    if ((l.status === 'NEW' || l.status === 'OPEN') && !l.assignedTo && (!l.callCenterRequestStatus || l.callCenterRequestStatus === 'REJECTED')) {
        stats.newTabConditions++;
    }

    if (l.assignedTo) {
        stats.assignedTabConditions++;
    }
  });

  console.log(JSON.stringify(stats, null, 2));
}

main().finally(() => prisma.$disconnect());
