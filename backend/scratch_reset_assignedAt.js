const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Resetting assignedAt for assigned pending leads to current time to clear dynamic delays...");
  
  const result = await prisma.lead.updateMany({
    where: {
      assignedTo: { not: null }
    },
    data: {
      assignedAt: new Date()
    }
  });

  console.log(`Updated ${result.count} leads' assignedAt to now.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
