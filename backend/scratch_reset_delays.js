const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Resetting r1DelayedDays and r2DelayedDays to 0 for all leads...");
  
  const result = await prisma.lead.updateMany({
    where: {
      OR: [
        { r1DelayedDays: { gt: 0 } },
        { r2DelayedDays: { gt: 0 } }
      ]
    },
    data: {
      r1DelayedDays: 0,
      r2DelayedDays: 0
    }
  });

  console.log(`Updated ${result.count} leads.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
