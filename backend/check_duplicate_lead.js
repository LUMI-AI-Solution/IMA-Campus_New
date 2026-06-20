const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: { phone: { contains: '703036022' } },
    include: { messages: true }
  });

  console.log(`Found ${leads.length} leads:`);
  leads.forEach(l => {
    console.log(`Lead ID: ${l.id}, Phone: "${l.phone}", Name: "${l.name}", Status: ${l.status}, Campaign: ${l.campaignType}`);
    console.log(`  Messages: ${l.messages.length}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
