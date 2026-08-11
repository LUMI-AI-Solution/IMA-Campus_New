const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'harshani' } },
        { firstName: { contains: 'Harshani' } }
      ]
    }
  });
  console.log("Users:", users.map(u => ({ id: u.id, name: u.firstName + " " + u.lastName, role: u.role, businessType: u.businessType })));

  if (users.length > 0) {
    for (const user of users) {
      const harshaniId = user.id;
      const leads = await prisma.lead.count({
        where: {
          assignedTo: harshaniId
        }
      });
      console.log(`Total leads for ${user.firstName} (${harshaniId}):`, leads);
      
      const openSemLeads = await prisma.lead.count({
        where: {
          assignedTo: harshaniId,
          campaignType: 'OPEN_SEMINAR'
        }
      });
      console.log(`Open Sem leads for ${user.firstName}:`, openSemLeads);

      const openSemPhase = await prisma.lead.findMany({
          where: { assignedTo: harshaniId, campaignType: 'OPEN_SEMINAR' },
          take: 5
      });
      console.log(`Sample Open Sem Leads for ${user.firstName}:`, openSemPhase.map(l => ({ id: l.id, status: l.status, openSemPhase: l.openSemPhase, campaignType: l.campaignType })));
    }
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
