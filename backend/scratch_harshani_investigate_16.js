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
        id: true, phone: true 
    },
    take: 5
  });

  for (const lead of harshaniLeads) {
     const notes = await prisma.note.findMany({
       where: { leadPhone: lead.phone },
       orderBy: { createdAt: 'desc' }
     });
     console.log(`Notes for lead ${lead.phone}:`);
     notes.forEach(n => console.log(` - ${n.createdAt}: ${n.content}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
