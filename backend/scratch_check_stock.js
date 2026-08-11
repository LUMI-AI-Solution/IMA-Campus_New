const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stockCount = await prisma.tuteStock.count();
  const historyCount = await prisma.tuteStockHistory.count();
  const deliveryCount = await prisma.delivery.count();
  const deliveryItemCount = await prisma.deliveryItem.count();
  
  console.log('TuteStock Count:', stockCount);
  console.log('TuteStockHistory Count:', historyCount);
  console.log('Delivery Count:', deliveryCount);
  console.log('DeliveryItem Count:', deliveryItemCount);
}

main().finally(() => prisma.$disconnect());
