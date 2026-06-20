const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items782 = await prisma.deliveryItem.findMany({ where: { deliveryId: 782 } });
  console.log("Delivery 782 Items:", items782);
  const items1007 = await prisma.deliveryItem.findMany({ where: { deliveryId: 1007 } });
  console.log("Delivery 1007 Items:", items1007);
}
main().catch(console.error).finally(() => prisma.$disconnect());
