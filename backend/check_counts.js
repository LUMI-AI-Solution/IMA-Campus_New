const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const lrpCount = await prisma.leadRoundProgress.count();
  const leadCount = await prisma.lead.count();
  const assignedLeadCount = await prisma.lead.count({ where: { assignedTo: { not: null } } });
  
  console.log({
    leadRoundProgressCount: lrpCount,
    totalLeads: leadCount,
    assignedLeads: assignedLeadCount
  });
}
run();
