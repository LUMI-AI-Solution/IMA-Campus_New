const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Deleting all WhatsApp call records...");
  const countBefore = await prisma.whatsAppCallRecord.count();
  console.log(`Current call records count: ${countBefore}`);

  const deleted = await prisma.whatsAppCallRecord.deleteMany({});
  console.log(`Successfully deleted ${deleted.count} call records!`);

  const countAfter = await prisma.whatsAppCallRecord.count();
  console.log(`Remaining call records count: ${countAfter}`);
}

main()
  .then(() => console.log("SUCCESS: All call records deleted."))
  .catch(err => console.error("ERROR deleting call records:", err))
  .finally(() => prisma.$disconnect());
